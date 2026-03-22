"""
Article block upload services.
Mirrors the course block services but looks up Article instead of Activity/Course.
"""
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, Request, UploadFile, status
from sqlmodel import Session, select

from src.db.articles import Article
from src.db.courses.blocks import Block, BlockRead, BlockTypeEnum
from src.db.organizations import Organization
from src.services.blocks.utils.upload_files import upload_file_and_return_file_object


BLOCK_TYPES = {
    "image": (BlockTypeEnum.BLOCK_IMAGE, "imageBlock", ["jpg", "jpeg", "png", "gif", "webp"]),
    "video": (BlockTypeEnum.BLOCK_VIDEO, "videoBlock", ["mp4", "webm"]),
    "audio": (BlockTypeEnum.BLOCK_AUDIO, "audioBlock", ["mp3", "wav", "ogg", "m4a"]),
    "pdf":   (BlockTypeEnum.BLOCK_DOCUMENT_PDF, "pdfBlock", ["pdf"]),
}


async def create_article_block(
    request: Request,
    file: UploadFile,
    article_uuid: str,
    block_type_key: str,
    current_user,
    db_session: Session,
) -> BlockRead:
    """Create a media block attached to an article."""
    if block_type_key not in BLOCK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid block type: {block_type_key}")

    block_type_enum, block_type_name, allowed_formats = BLOCK_TYPES[block_type_key]

    # Look up article
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Access control: user must be the author or have create permission
    if current_user.id != article.author_id:
        from src.services.articles.articles import _get_article_rights
        rights = _get_article_rights(current_user.id, article.org_id, db_session)
        if not rights.get("action_create"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to upload media to this article")

    # Look up org
    org = db_session.exec(
        select(Organization).where(Organization.id == article.org_id)
    ).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Generate block UUID and upload file
    block_uuid = f"block_{uuid4()}"
    block_data = await upload_file_and_return_file_object(
        request,
        file,
        block_uuid,
        allowed_formats,
        block_type_name,
        org.org_uuid,
        article_uuid=article_uuid,
    )

    # Create block row
    block = Block(
        block_type=block_type_enum,
        content=block_data.model_dump(),
        org_id=org.id,
        article_id=article.id,
        block_uuid=block_uuid,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)

    return BlockRead.model_validate(block)


async def get_article_block(block_uuid: str, db_session: Session) -> BlockRead:
    """Retrieve a block by UUID."""
    block = db_session.exec(
        select(Block).where(Block.block_uuid == block_uuid)
    ).first()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return BlockRead.model_validate(block)
