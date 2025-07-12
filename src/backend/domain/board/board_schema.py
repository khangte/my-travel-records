# src/backend/domain/board/board_schema.py

from pydantic import BaseModel
from datetime import datetime

# BoardImg 테이블에서 이미지 url 링크
class BoardImg(BaseModel):
    img_url: str

    class Config:
        from_attributes = True

#  Board 호출 구문
class Board(BaseModel):
    board_id: int
    title: str
    writer_date: datetime
    update_date: datetime
    images: list[BoardImg] = []

    class Config:
        from_attributes = True

# board 생성 
class BoardCreate(BaseModel):
    title: str
    location: str
