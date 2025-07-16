document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login.html';
        return;
    }
    const headers = { 'Authorization': `Bearer ${token}` };
    const photoGallery = document.getElementById('photo-gallery');
    let boardCache = [];

    // 사용자 프로필 표시
    fetch('/api/mypage/profile', { headers })
        .then(response => {
            if (!response.ok) throw new Error('프로필 정보 로드 실패');
            return response.json();
        })
        .then(user => {
            document.getElementById('user-nickname').textContent = user.nickname || user.id;
            document.getElementById('post-count').textContent = user.post_count;
        })
        .catch(error => console.error('내 정보 로딩 실패:', error));

    // 게시물 목록 표시
    fetch('/api/board/me', { headers })
        .then(response => {
            if (!response.ok) throw new Error('게시물 목록 로드 실패');
            return response.json();
        })
        .then(boards => {
            boardCache = boards;
            photoGallery.innerHTML = '';
            boards.forEach(board => {
                const imageUrl = (board.images && board.images.length > 0) 
                    ? board.images[0].img_url 
                    : '/public/images/profile_ex.png';

                const photoItemHTML = `
                    <div class="photo-item" data-post-id="${board.board_id}">
                        <img src="${imageUrl}" alt="${board.title}">
                        <div class="photo-overlay">
                            <p class="photo-title">${board.title}</p>
                            <button class="delete-photo-btn" title="삭제">×</button>
                        </div>
                    </div>
                `;
                photoGallery.insertAdjacentHTML('beforeend', photoItemHTML);
            });
        })
        .catch(error => console.error('게시물 목록 로딩 실패:', error));

    // 삭제 및 상세 보기 이벤트
    photoGallery.addEventListener('click', function(event) {
        const photoItem = event.target.closest('.photo-item');
        if (!photoItem) return;

        const postId = parseInt(photoItem.dataset.postId, 10);

        // 삭제 버튼 클릭
        if (event.target.classList.contains('delete-photo-btn')) {
            const isConfirmed = confirm("정말로 이 게시물을 삭제하시겠습니까?");
            if (isConfirmed) {
                deletePost(postId, photoItem);
            }
            return;
        }

        // 상세 보기 (팝업)
        const board = boardCache.find(b => b.board_id === postId);
        if (!board) return;

        document.getElementById('popup-image').src = board.images?.[0]?.img_url || '/public/images/profile_ex.png';
        document.getElementById('popup-title').textContent = board.title;
        document.getElementById('popup-modal').classList.remove('hidden');
    });

    // 로그아웃
    const logoutBtn = document.querySelector('.nav .nav-btn[href="/logout"]');
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("access_token");
            localStorage.removeItem("username");
            localStorage.setItem("is_login", "false");
            window.location.href = "/index.html";
        });
    }

    // 팝업 닫기 기능
    const closeBtn = document.querySelector('.close-btn');
    const popupModal = document.getElementById('popup-modal');

    closeBtn?.addEventListener('click', () => {
        popupModal.classList.add('hidden');
    });

    popupModal?.addEventListener('click', (e) => {
        if (e.target === popupModal) {
            popupModal.classList.add('hidden');
        }
    });
});


// 게시물 삭제 함수
async function deletePost(postId, elementToRemove) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('삭제 권한이 없습니다.');
        return;
    }
    try {
        const response = await fetch(`/api/board/delete/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert('게시물이 성공적으로 삭제되었습니다.');
            elementToRemove.remove();

            const postCountEl = document.getElementById('post-count');
            let currentCount = parseInt(postCountEl.textContent, 10);
            if (!isNaN(currentCount)) {
                postCountEl.textContent = currentCount - 1;
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.detail || '삭제 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('삭제 요청 중 에러 발생:', error);
    }
}
