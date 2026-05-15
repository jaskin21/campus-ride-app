import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
} from 'aws-amplify/auth'

export const authService = {
  async login(email: string, password: string) {
    return await signIn({
      username: email,
      password,
      options: {
        authFlowType: 'USER_PASSWORD_AUTH',
      },
    })
  },

  async register(email: string, password: string, firstName: string, lastName: string) {
    return await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          given_name: firstName,
          family_name: lastName,
        },
      },
    })
  },

  async confirmCode(email: string, code: string) {
    return await confirmSignUp({ username: email, confirmationCode: code })
  },

  async resendCode(email: string) {
    return await resendSignUpCode({ username: email })
  },

  async logout() {
    return await signOut()
  },

  async getCurrentUser() {
    return await getCurrentUser()
  },

  async getSession() {
    return await fetchAuthSession({ forceRefresh: true })
  },
}