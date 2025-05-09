import apiClient from "@/api";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { jwtDecode } from 'jwt-decode';
import { eventBus } from '@/utils/eventBus'; // 추가하세요


export const useAuthStore = defineStore('auth', () => {
    // 페이지 이동하기 위해 router를 추가
    const router = useRouter();

    // 로그인 상태 저장
    const isLoggedIn = ref(false);

    // 사용자 정보 저장
    const userInfo = reactive({
        username: '',
        role: ''
    });

    // 로그인 처리
    const login = async (loginData) => {
        try {
            const response = await apiClient.post('/auth/login', loginData);

            if(response.status === 200) {
                const parseToken = parseJwt(response.data.accessToken);

                // 토큰들을 로컬 스토리지에 저장
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                // 로그인 상태 변경
                isLoggedIn.value = true;

                // 토큰에서 사용자 정보를 추출
                userInfo.username = parseToken.username;
                userInfo.role = parseToken.role;

                localStorage.setItem('user', JSON.stringify({ username: parseToken.username }));

                eventBus.emit('login-success', userInfo.username);


                console.log('로그인 성공');
                console.log('username: ', userInfo.username);
                console.log('role: ', userInfo.role);
                router.push({name: 'home'});
            }
        } catch (error) {
            console.log(error);

            // if (error.status === 401) {
            if (error.response.data.code === 401 || error.response.data.code === 403 || error.response.data.code === 400) {
                alert(error.response.data.message);
            } else if (error.response.data.code === 423) {
                alert(error.response.data.message);
                if (confirm('이메일 인증 후 비밀번호를 변경하시겠습니까?')) {
                    router.push({name: 'updatePassword'});
                }
            } else {
                alert('에러가 발생했습니다.');
                
            }
        }
    };

    // 새로고침 시 Pinia 상태가 초기화되므로 로그인 유지 위해 추가
    const checkLogin = () => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {

            isLoggedIn.value = true;

            const parseToken = parseJwt(accessToken);
            userInfo.username = parseToken.username;
            userInfo.role = parseToken.role;
        } else {
            isLoggedIn.value = false;
        }
    };

    const logout = async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');

            if (isInvalidAccessToken(accessToken)) {
                alert('다시 로그인해 주세요.');

                logoutUser();

                return;
            }

            
            const response = await apiClient.post('/auth/logout',{},{headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`
              }});

            if (response.status === 204) {
                logoutUser();
            } 
        } catch (error) {
            console.log(error);

            alert('에러가 발생했습니다.');
        }
    };

    const logoutUser = () => {
        // 토큰들을 로컬 스토리지에 삭제
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // 로그인 상태를 변경한다.
        isLoggedIn.value = false;

        // 사용자 정보를 지운다.
        userInfo.username = '';
        userInfo.role = '';

        // 로그인 페이지로 리다이렉트
        router.push({name: 'login'});
    };

    // 액세스 토큰 유효성 검사 함수
    const isInvalidAccessToken = (token) => {
        try {
            const decoded = parseJwt(token); // JWT 디코딩
            const currentTime = Math.floor(Date.now() / 1000);

            return decoded.exp <= currentTime;  // 만료 시간이 현재 시간보다 크면 유효
        } catch (error) {
            return false;  // 토큰 디코딩에 실패하면 유효하지 않다고 판단
        }
    };

    const parseJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            // JWT의 페이로드 부분을 디코딩할 때 URL 안전한 Base64 문자열을 일반 Base64로 변환하는 작업을 한다.
            //   - JWT 토큰은 Base64 URL 안전한 방식으로 인코딩된다.
            //   - Base64 URL 안전 인코딩은 URL과 파일 경로에서 사용할 수 있도록 몇 가지 문자를 수정한 Base64 인코딩 방식이다.
            //     (- 대신 +, _ 대신 /)
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            
            return JSON.parse(jsonPayload)
        } catch (e) {
            return null
        }
    };

    const signup = async (formData) => {
        try {
            const response = await apiClient.post('/auth/join', formData);

            if(response.status === 200) {
                alert('회원가입이 완료되었습니다.');
                
                console.log(response);

                router.push({name: 'login'});
            }
        } catch (error) {
            console.log(error);

            // if (error.status === 401) {
            if (error.response.data.code === 401) {
                alert(error.response.data.message);
            } else {
                alert('에러가 발생했습니다.');
            }
        }
    };

    const isValidEmail = ref(false);

    const validateEmail = async (formData) => {
        try {

            const username = formData.username;
            const email = formData.email;

            const data = {
                username,
                email
            };
            const response = await apiClient.post('/matchEmail', data);

            if(response.status === 200) {
                isValidEmail.value = true;

                alert('이메일 확인이 완료되었습니다.');
            } else {
                isValidEmail.value = false;

                alert('이메일 확인에 실패했습니다.');
            }

        } catch(error)  {
            console.log(error);

            alert('에러가 발생했습니다.');
        }
    }

    const authEmailSend = async (email) => {
        try {
            const response = await apiClient.post('/email/send', email);

            if(response.status === 200) {
                alert('인증 메일을 발송했습니다.');

                console.log(response);
            }
        } catch (error) {
            console.log(error);

            alert('에러가 발생했습니다.');
        }
    };

    const isCheckedEmail = ref(false);

    const authEmailValidate = async (formData) => {
        try {
            const response = await apiClient.post('/email/validate?authCode=' + formData.validateCode, { email : formData.email });

            if(response.data.success === true) {
                isCheckedEmail.value = true;

                alert('이메일 인증이 완료되었습니다.');

                console.log(response);
            } else {
                isCheckedEmail.value = false;

                alert('이메일 인증에 실패했습니다.');

                console.log(response);
            }
        } catch (error) {
            isCheckedEmail.value = false;

            alert('에러가 발생했습니다.');

            console.log(error);
        }
    };


  const getUserInfo = () => {
    let strUserInfo = window.localStorage.getItem('userInfo');
    if (!strUserInfo) {
      return { authenticated: false };
    } else {
      return JSON.parse(strUserInfo);
    }
  };

  const getUsernameFromToken = () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.warn("토큰이 존재하지 않습니다.");
      return null;
    }

    try {
      const decoded = jwtDecode(token);  // JWT 디코딩
      return decoded.username || null;   // username 반환
    } catch (error) {
      console.warn("JWT 디코딩 실패:", error);
      return null;
    }
  }

    return { isLoggedIn, userInfo, login, checkLogin, logout, signup, authEmailSend, authEmailValidate, isCheckedEmail, getUsernameFromToken, getUserInfo, validateEmail, isValidEmail };
});