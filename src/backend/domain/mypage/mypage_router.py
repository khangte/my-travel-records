from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from database import get_db
from models import User, Board
from domain.user.user_auth import get_current_user
from domain.mypage import mypage_crud, mypage_schema 
from domain.mypage.mypage_schema import UserProfile, ProfileUpdate, UserStatsResponse
from domain.user.user_auth import create_access_token
from domain.user.user_schema import Token  # response_model 추가

import shutil
import os

router = APIRouter(prefix="/api/mypage")

# ✨ 서버 실행 위치에 상관없이 항상 올바른 경로를 가리키도록 절대 경로로 수정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT_DIR = os.path.join(BASE_DIR, "..", "..", "..", "..")
UPLOAD_DIRECTORY = os.path.join(PROJECT_ROOT_DIR, "uploads", "profiles")

@router.get("/profile", response_model=mypage_schema.UserProfile)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user is None:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    post_count = mypage_crud.count_user_boards(db=db, user_num=current_user.user_num)
    location_count = mypage_crud.count_unique_user_districts(db=db, user_num=current_user.user_num)

    return mypage_schema.UserProfile(
        id=current_user.id,
        register_date=current_user.register_date,
        birth=current_user.birth,
        post_count=post_count,
        location_count=location_count
    )

# 204 No Content는 본문이 없기 때문에
# .json()으로 파싱하면 무조건 오류가 납니다.
@router.put("/profile",
            response_model=Token,
            status_code=200
            )
def update_my_profile(
    _profile_update: mypage_schema.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다.")

    mypage_crud.update_profile(db=db, db_user=current_user, profile_update=_profile_update)

    # 업데이트된 사용자 정보로 새 토큰 발급
    # user_auth 에서 엑세스 토큰을 새로 발급 받음
    new_id = _profile_update.id if _profile_update.id else current_user.id
    new_token = create_access_token(data={"sub": new_id})

    print("📥 update_my_profile 들어옴")
    print("📤 응답 직전 데이터:", {
        "access_token": new_token,
        "token_type": "bearer",
        "id": new_id
    })

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "id": new_id
    }

# @router.post("/profile/image", status_code=status.HTTP_204_NO_CONTENT)
# def upload_profile_image(
#     file: UploadFile = File(...),
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     if current_user is None:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다.")

#     os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
    
#     file_extension = file.filename.split('.')[-1]
#     filename = f"{current_user.id}.{file_extension}"
#     file_path = os.path.join(UPLOAD_DIRECTORY, filename)

#     with open(file_path, "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)

#     # ✨ 실제 파일이 저장되는 /uploads/ 경로와 일치하도록 URL 수정
#     file_url = f"/uploads/profiles/{filename}"
#     current_user.profile_img = file_url
#     db.add(current_user)
#     db.commit()

# ✨ 이 API는 이제 /profile API와 기능이 중복되지만, 혹시 다른 곳에서 사용할 경우를 위해 그대로 둡니다.
# 만약 더 이상 필요 없다면 이 라우터 자체를 삭제해도 좋습니다.
@router.get("/me/stats", response_model=UserStatsResponse)
def read_user_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다.")

    user_num = current_user.user_num
    post_count = mypage_crud.count_user_boards(db=db, user_num=user_num)
    visited_districts_count = mypage_crud.count_unique_user_districts(db=db, user_num=user_num)

    return {
        "post_count": post_count,
        "visited_districts_count": visited_districts_count
    }