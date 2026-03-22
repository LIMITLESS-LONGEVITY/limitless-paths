"""
Tests for article block upload endpoints, model, schema, and access control.

Covers:
 1. Block model with article_id (and backward compat with course_id/activity_id)
 2. BlockFile schema with article_uuid (and backward compat with activity_uuid)
 3. Article block service functions (create, get, error cases)
 4. Access control (author can upload, non-author without permission denied)
 5. Upload utility directory path building
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from sqlmodel import Session

# DB models — importing ensures all FK-referenced tables exist in SQLite metadata
from src.db.organizations import Organization  # noqa: F401
from src.db.users import User  # noqa: F401
from src.db.content_pillars import ContentPillar  # noqa: F401
from src.db.articles import Article, ArticleStatusEnum
from src.db.courses.courses import Course  # noqa: F401 — FK target for Block.course_id
from src.db.courses.chapters import Chapter  # noqa: F401 — FK target for Block.chapter_id
from src.db.courses.activities import Activity  # noqa: F401 — FK target for Block.activity_id
from src.db.courses.blocks import Block, BlockRead, BlockTypeEnum

# Schemas
from src.services.blocks.schemas.files import BlockFile

# Services under test
from src.services.blocks.article_blocks import create_article_block, get_article_block


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_org(db_session: Session, slug: str = "test-org") -> Organization:
    """Create and return a minimal Organization."""
    org = Organization(
        name="Test Org",
        slug=slug,
        email=f"{slug}@example.com",
        org_uuid=f"org_{slug}",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


def _make_user(db_session: Session, username: str = "author") -> User:
    """Create and return a minimal User."""
    user = User(
        username=username,
        first_name="Test",
        last_name="Author",
        email=f"{username}@example.com",
        password="hashed_password",
        user_uuid=f"user_{username}",
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_article(db_session: Session, org_id: int, author_id: int, slug: str = "test-article") -> Article:
    """Create and return a minimal Article."""
    article = Article(
        article_uuid=f"article_{slug}",
        title="Test Article",
        slug=slug,
        status=ArticleStatusEnum.DRAFT.value,
        org_id=org_id,
        author_id=author_id,
    )
    db_session.add(article)
    db_session.commit()
    db_session.refresh(article)
    return article


def _make_block(db_session: Session, org_id: int, article_id: int | None = None,
                course_id: int | None = None, activity_id: int | None = None,
                block_uuid: str = "block_test-1") -> Block:
    """Create and return a minimal Block."""
    block = Block(
        block_type=BlockTypeEnum.BLOCK_IMAGE,
        content={"file_id": "test", "file_format": "png"},
        org_id=org_id,
        article_id=article_id,
        course_id=course_id,
        activity_id=activity_id,
        block_uuid=block_uuid,
        creation_date="2026-01-01",
        update_date="2026-01-01",
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)
    return block


# ---------------------------------------------------------------------------
# 1. Block model tests
# ---------------------------------------------------------------------------

class TestBlockModel:
    def test_block_with_article_id(self, db_session: Session):
        """Block can be created with article_id and null course_id/activity_id."""
        org = _make_org(db_session, slug="block-org-1")
        user = _make_user(db_session, username="block-author-1")
        article = _make_article(db_session, org.id, user.id, slug="block-article-1")

        block = _make_block(db_session, org_id=org.id, article_id=article.id, block_uuid="block_art-1")

        assert block.id is not None
        assert block.article_id == article.id
        assert block.course_id is None
        assert block.activity_id is None
        assert block.org_id == org.id

    def test_block_with_activity_id(self, db_session: Session):
        """Block still works with course_id/activity_id (backward compat)."""
        org = _make_org(db_session, slug="block-org-2")

        # Create a course + activity for FK references
        course = Course(
            name="Test Course",
            description="desc",
            public=True,
            open_to_contributors=False,
            org_id=org.id,
            course_uuid="course_test-1",
            creation_date="2026-01-01",
            update_date="2026-01-01",
        )
        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)

        chapter = Chapter(
            name="Ch1",
            description="desc",
            course_id=course.id,
            chapter_uuid="chapter_test-1",
            creation_date="2026-01-01",
            update_date="2026-01-01",
        )
        db_session.add(chapter)
        db_session.commit()
        db_session.refresh(chapter)

        activity = Activity(
            name="Act1",
            activity_type="TYPE_VIDEO",
            activity_sub_type="SUBTYPE_VIDEO_HOSTED",
            chapter_id=chapter.id,
            course_id=course.id,
            org_id=org.id,
            activity_uuid="activity_test-1",
            creation_date="2026-01-01",
            update_date="2026-01-01",
        )
        db_session.add(activity)
        db_session.commit()
        db_session.refresh(activity)

        block = _make_block(
            db_session,
            org_id=org.id,
            course_id=course.id,
            activity_id=activity.id,
            block_uuid="block_act-1",
        )

        assert block.id is not None
        assert block.course_id == course.id
        assert block.activity_id == activity.id
        assert block.article_id is None

    def test_block_read_schema_optional_fields(self):
        """BlockRead accepts null course_id, activity_id, and article_id."""
        schema = BlockRead(
            id=1,
            block_type=BlockTypeEnum.BLOCK_IMAGE,
            content={"file_id": "test"},
            org_id=1,
            course_id=None,
            chapter_id=None,
            activity_id=None,
            article_id=None,
            block_uuid="block_schema-1",
            creation_date="2026-01-01",
            update_date="2026-01-01",
        )
        assert schema.course_id is None
        assert schema.activity_id is None
        assert schema.article_id is None
        assert schema.org_id == 1


# ---------------------------------------------------------------------------
# 2. BlockFile schema tests
# ---------------------------------------------------------------------------

class TestBlockFileSchema:
    def test_blockfile_with_article_uuid(self):
        """BlockFile accepts article_uuid and null activity_uuid."""
        bf = BlockFile(
            file_id="img_001",
            file_format="png",
            file_name="hero.png",
            file_size=1024,
            file_type="image/png",
            article_uuid="article_test-1",
            activity_uuid=None,
        )
        assert bf.article_uuid == "article_test-1"
        assert bf.activity_uuid is None

    def test_blockfile_with_activity_uuid(self):
        """BlockFile still works with activity_uuid (backward compat)."""
        bf = BlockFile(
            file_id="img_002",
            file_format="jpg",
            file_name="photo.jpg",
            file_size=2048,
            file_type="image/jpeg",
            activity_uuid="activity_test-1",
            article_uuid=None,
        )
        assert bf.activity_uuid == "activity_test-1"
        assert bf.article_uuid is None

    def test_blockfile_both_optional(self):
        """BlockFile can have both activity_uuid and article_uuid as None."""
        bf = BlockFile(
            file_id="img_003",
            file_format="webp",
            file_name="banner.webp",
            file_size=512,
            file_type="image/webp",
        )
        assert bf.activity_uuid is None
        assert bf.article_uuid is None


# ---------------------------------------------------------------------------
# 3. Article block service tests
# ---------------------------------------------------------------------------

class TestArticleBlockService:
    @pytest.mark.asyncio
    async def test_create_article_image_block(self, db_session: Session):
        """Creating an image block for an article stores it correctly."""
        org = _make_org(db_session, slug="svc-org-1")
        user = _make_user(db_session, username="svc-author-1")
        article = _make_article(db_session, org.id, user.id, slug="svc-article-1")

        mock_request = MagicMock()
        mock_file = MagicMock(spec=['filename', 'content_type', 'file', 'read'])
        mock_file.filename = "photo.jpg"
        mock_file.content_type = "image/jpeg"

        mock_block_file = BlockFile(
            file_id="block_uploaded",
            file_format="jpg",
            file_name="photo.jpg",
            file_size=4096,
            file_type="image/jpeg",
            article_uuid=article.article_uuid,
        )

        with patch(
            "src.services.blocks.article_blocks.upload_file_and_return_file_object",
            new_callable=AsyncMock,
            return_value=mock_block_file,
        ):
            result = await create_article_block(
                request=mock_request,
                file=mock_file,
                article_uuid=article.article_uuid,
                block_type_key="image",
                current_user=user,
                db_session=db_session,
            )

        assert isinstance(result, BlockRead)
        assert result.block_type == BlockTypeEnum.BLOCK_IMAGE
        assert result.article_id == article.id
        assert result.org_id == org.id
        assert result.course_id is None
        assert result.activity_id is None

    @pytest.mark.asyncio
    async def test_create_article_block_invalid_type(self, db_session: Session):
        """Invalid block type raises 400."""
        from fastapi import HTTPException

        org = _make_org(db_session, slug="svc-org-2")
        user = _make_user(db_session, username="svc-author-2")
        article = _make_article(db_session, org.id, user.id, slug="svc-article-2")

        with pytest.raises(HTTPException) as exc_info:
            await create_article_block(
                request=MagicMock(),
                file=MagicMock(),
                article_uuid=article.article_uuid,
                block_type_key="spreadsheet",
                current_user=user,
                db_session=db_session,
            )
        assert exc_info.value.status_code == 400
        assert "Invalid block type" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_create_article_block_article_not_found(self, db_session: Session):
        """Non-existent article_uuid raises 404."""
        from fastapi import HTTPException

        org = _make_org(db_session, slug="svc-org-3")
        user = _make_user(db_session, username="svc-author-3")

        with pytest.raises(HTTPException) as exc_info:
            await create_article_block(
                request=MagicMock(),
                file=MagicMock(),
                article_uuid="article_does-not-exist",
                block_type_key="image",
                current_user=user,
                db_session=db_session,
            )
        assert exc_info.value.status_code == 404
        assert "Article not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_article_block(self, db_session: Session):
        """Can retrieve a block by UUID."""
        org = _make_org(db_session, slug="svc-org-4")
        user = _make_user(db_session, username="svc-author-4")
        article = _make_article(db_session, org.id, user.id, slug="svc-article-4")

        block = _make_block(db_session, org_id=org.id, article_id=article.id, block_uuid="block_get-1")

        result = await get_article_block("block_get-1", db_session)

        assert isinstance(result, BlockRead)
        assert result.block_uuid == "block_get-1"
        assert result.article_id == article.id

    @pytest.mark.asyncio
    async def test_get_article_block_not_found(self, db_session: Session):
        """Non-existent block_uuid raises 404."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await get_article_block("block_nonexistent", db_session)
        assert exc_info.value.status_code == 404
        assert "Block not found" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 4. Access control tests
# ---------------------------------------------------------------------------

class TestArticleBlockAccessControl:
    @pytest.mark.asyncio
    async def test_article_block_author_can_upload(self, db_session: Session):
        """Article author can create blocks on their article."""
        org = _make_org(db_session, slug="acl-org-1")
        author = _make_user(db_session, username="acl-author-1")
        article = _make_article(db_session, org.id, author.id, slug="acl-article-1")

        mock_block_file = BlockFile(
            file_id="block_acl",
            file_format="png",
            file_name="diagram.png",
            file_size=2048,
            file_type="image/png",
            article_uuid=article.article_uuid,
        )

        with patch(
            "src.services.blocks.article_blocks.upload_file_and_return_file_object",
            new_callable=AsyncMock,
            return_value=mock_block_file,
        ):
            result = await create_article_block(
                request=MagicMock(),
                file=MagicMock(),
                article_uuid=article.article_uuid,
                block_type_key="image",
                current_user=author,
                db_session=db_session,
            )

        assert isinstance(result, BlockRead)
        assert result.article_id == article.id

    @pytest.mark.asyncio
    async def test_article_block_non_author_without_permission_denied(self, db_session: Session):
        """Non-author without action_create permission gets 403."""
        from fastapi import HTTPException

        org = _make_org(db_session, slug="acl-org-2")
        author = _make_user(db_session, username="acl-author-2")
        other_user = _make_user(db_session, username="acl-other-2")
        article = _make_article(db_session, org.id, author.id, slug="acl-article-2")

        # _get_article_rights is imported lazily inside create_article_block
        # from src.services.articles.articles, so patch it there.
        with patch(
            "src.services.articles.articles._get_article_rights",
            return_value={"action_create": False},
        ):
            with pytest.raises(HTTPException) as exc_info:
                await create_article_block(
                    request=MagicMock(),
                    file=MagicMock(),
                    article_uuid=article.article_uuid,
                    block_type_key="image",
                    current_user=other_user,
                    db_session=db_session,
                )
        assert exc_info.value.status_code == 403
        assert "Not authorized" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 5. Upload utility tests
# ---------------------------------------------------------------------------

class TestUploadUtilityDirectory:
    @pytest.mark.asyncio
    async def test_upload_utility_article_directory(self):
        """Upload utility builds correct directory path for article context."""
        mock_request = MagicMock()
        mock_file = MagicMock()
        mock_file.filename = "test.png"
        mock_file.content_type = "image/png"
        mock_file.file = MagicMock()
        mock_file.read = AsyncMock(return_value=b"fake image data")

        with patch(
            "src.services.blocks.utils.upload_files.upload_file",
            new_callable=AsyncMock,
            return_value="block_uploaded.png",
        ) as mock_upload:
            result = await (
                __import__(
                    "src.services.blocks.utils.upload_files", fromlist=["upload_file_and_return_file_object"]
                ).upload_file_and_return_file_object(
                    mock_request,
                    mock_file,
                    "block_test-123",
                    ["jpg", "jpeg", "png"],
                    "imageBlock",
                    "org_test-org",
                    article_uuid="article_test-1",
                )
            )

            # Verify the directory passed to upload_file uses article path
            call_kwargs = mock_upload.call_args
            directory = call_kwargs.kwargs.get("directory") or call_kwargs[1].get("directory")
            assert "articles/article_test-1/blocks/imageBlock/block_test-123" in directory

            # Verify the returned BlockFile has article_uuid set
            assert isinstance(result, BlockFile)
            assert result.article_uuid == "article_test-1"
            assert result.activity_uuid is None

    @pytest.mark.asyncio
    async def test_upload_utility_activity_directory(self):
        """Upload utility still builds correct directory path for activity context."""
        mock_request = MagicMock()
        mock_file = MagicMock()
        mock_file.filename = "video.mp4"
        mock_file.content_type = "video/mp4"
        mock_file.file = MagicMock()
        mock_file.read = AsyncMock(return_value=b"fake video data")

        with patch(
            "src.services.blocks.utils.upload_files.upload_file",
            new_callable=AsyncMock,
            return_value="block_uploaded.mp4",
        ) as mock_upload:
            from src.services.blocks.utils.upload_files import upload_file_and_return_file_object

            result = await upload_file_and_return_file_object(
                mock_request,
                mock_file,
                "block_test-456",
                ["mp4", "webm"],
                "videoBlock",
                "org_test-org",
                activity_uuid="activity_act-1",
                course_uuid="course_crs-1",
            )

            call_kwargs = mock_upload.call_args
            directory = call_kwargs.kwargs.get("directory") or call_kwargs[1].get("directory")
            assert "courses/course_crs-1/activities/activity_act-1/dynamic/blocks/videoBlock/block_test-456" in directory

            assert isinstance(result, BlockFile)
            assert result.activity_uuid == "activity_act-1"
            assert result.article_uuid is None
