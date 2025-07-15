document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login.html';
        return;
    }
    const headers = { 'Authorization': `Bearer ${token}` };

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

    const photoGallery = document.getElementById('photo-gallery');
    fetch('/api/board/me', { headers })
        .then(response => {
            if (!response.ok) throw new Error('게시물 목록 로드 실패');
            return response.json();
        })
        .then(boards => {
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

    photoGallery.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-photo-btn')) {
            const isConfirmed = confirm("정말로 이 게시물을 삭제하시겠습니까?");
            if (isConfirmed) {
                const photoItem = event.target.closest('.photo-item');
                const postId = photoItem.dataset.postId;
                deletePost(postId, photoItem);
            }
        }
    });

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
});

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
