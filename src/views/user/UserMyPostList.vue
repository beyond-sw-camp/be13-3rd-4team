<template>
  <div class="user-post-list">
    <h2>{{ userName }} 님의 게시글 목록</h2>

    <label for="boardType">게시판 선택:</label>
    <select id="boardType" v-model="boardType">
      <option value="NOTICE">공지 게시판</option>
      <option value="FREE">자유 게시판</option>
      <option value="PROJECT_RECRUIT">프로젝트 모집 게시판</option>
    </select>

    <div v-if="posts.length === 0">게시글이 없습니다.</div>

    <table v-else>
      <thead>
      <tr>
        <th>번호</th>
        <th>제목</th>
        <th>게시판</th>
        <th>상태</th>
        <th>조회수</th>
        <th>북마크</th>
        <th>댓글</th>
        <th>작성일</th>
        <th>삭제</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(post, index) in posts" :key="post.postNo">
        <td>{{ currentPage * 10 + index + 1 }}</td>
        <td>
          <router-link :to="`/posts/${post.postNo}`" class="post-title-link">
            {{ post.title }}
          </router-link>
        </td>
        <td>{{ post.boardType }}</td>
        <td>{{ post.postStatus }}</td>
        <td>{{ post.viewCount }}</td>
        <td>{{ post.bookmarkCount }}</td>
        <td>{{ post.commentCount }}</td>
        <td>{{ formatDate(post.createdAt) }}</td>
        <td>
          <button @click="deletePost(post.postNo)">삭제</button>
        </td>
      </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button @click="prevPage" :disabled="currentPage === 0">이전</button>
      <span>{{ currentPage + 1 }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage >= totalPages - 1">다음</button>
    </div>

    <button @click="goBack" class="back-btn">뒤로가기</button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api';

const router = useRouter();

const posts = ref([]);
const userName = ref('');
const currentPage = ref(0);
const totalPages = ref(1);
const boardType = ref(localStorage.getItem("boardType") || 'FREE');

const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
const userNo = currentUser.userNo;
userName.value = currentUser.username;

const fetchPosts = async () => {
  try {
    const res = await apiClient.get(`/user-page/posts`, {
      params: {
        boardType: boardType.value,
        page: currentPage.value,
      },
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
    });

    posts.value = res.data.content;
    totalPages.value = Math.max(1, res.data.totalPages);
  } catch (error) {
    console.error('게시글을 불러오는 중 오류 발생:', error);
  }
};

const deletePost = async (postNo) => {
  const confirmed = confirm("정말 이 게시글을 삭제하시겠습니까?");
  if (!confirmed) return;

  try {
    await apiClient.delete(`/posts/${postNo}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    });
    fetchPosts();
  } catch (error) {
    console.error("게시글 삭제에 실패했습니다:", error);
    alert("게시글 삭제에 실패했습니다.");
  }
};

watch(boardType, (newVal) => {
  localStorage.setItem("boardType", newVal);
  posts.value = [];
  currentPage.value = 0;
  fetchPosts();
});

onMounted(() => {
  fetchPosts();
});

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    fetchPosts();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
    fetchPosts();
  }
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const goBack = () => {
  router.back();
};
</script>

<style scoped>
.user-post-list {
  padding: 20px;
}
label {
  font-weight: bold;
  margin-right: 10px;
}
select {
  padding: 5px;
  margin-bottom: 15px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}
th, td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}
.pagination button {
  margin: 0 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}
.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.back-btn {
  display: block;
  margin: 1rem auto;
  padding: 0.75rem 1.5rem;
  border: none;
  background-color: #6c757d;
  color: white;
  cursor: pointer;
}
.back-btn:hover {
  background-color: #545b62;
}
.post-title-link {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
.post-title-link:hover {
  text-decoration: underline;
  font-weight: bold;
}
</style>
