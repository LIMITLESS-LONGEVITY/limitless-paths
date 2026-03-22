"""Article block upload endpoints."""
from fastapi import APIRouter, Depends, Request, UploadFile
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.courses.blocks import BlockRead
from src.security.auth import get_authenticated_user
from src.services.blocks.article_blocks import create_article_block, get_article_block

router = APIRouter()


@router.post("/{article_uuid}/blocks/image", response_model=BlockRead)
async def api_create_article_image_block(
    request: Request, article_uuid: str, file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "image", current_user, db_session)


@router.post("/{article_uuid}/blocks/video", response_model=BlockRead)
async def api_create_article_video_block(
    request: Request, article_uuid: str, file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "video", current_user, db_session)


@router.post("/{article_uuid}/blocks/audio", response_model=BlockRead)
async def api_create_article_audio_block(
    request: Request, article_uuid: str, file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "audio", current_user, db_session)


@router.post("/{article_uuid}/blocks/pdf", response_model=BlockRead)
async def api_create_article_pdf_block(
    request: Request, article_uuid: str, file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "pdf", current_user, db_session)


@router.get("/{article_uuid}/blocks/{block_uuid}", response_model=BlockRead)
async def api_get_article_block(
    article_uuid: str, block_uuid: str,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await get_article_block(block_uuid, db_session)
