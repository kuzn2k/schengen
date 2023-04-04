<template>
<!-- todo link anonymous to account -->
  <v-btn icon @click="loginAnonymous" v-if="!loggedIn">
    <v-icon icon="mdi-account-circle"></v-icon>
    <v-tooltip
      activator="parent"
      location="bottom"
    >Demo</v-tooltip>
  </v-btn>
  <v-btn icon @click="loginByGoogle" v-if="!loggedIn">
    <v-icon icon="mdi-google"></v-icon>
    <v-tooltip
      activator="parent"
      location="bottom"
    >Sign in with Google</v-tooltip>  
  </v-btn>
  <v-btn icon @click="loginByGithub" v-if="!loggedIn">
    <v-icon icon="mdi-github"></v-icon>
    <v-tooltip
      activator="parent"
      location="bottom"
    >Sign in with GitHub</v-tooltip>
  </v-btn>
  <v-btn icon @click="logout" v-if="loggedIn">
    <v-icon icon="mdi-logout"></v-icon>
    <v-tooltip
      activator="parent"
      location="bottom"
    >Sign out</v-tooltip>  
  </v-btn>
  <v-snackbar v-model="showMessage" :timeout="7000">{{ message }}</v-snackbar>
</template>

<script>
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, linkWithPopup, signOut, getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword } from "firebase/auth"
import { getAnalytics, setUserId, logEvent } from "firebase/analytics"

export default {
  name: 'AuthBar',
  props: ['userUid', 'userName', 'email', 'isLoggedIn', 'isAnonymous'],
  emits: ['update:userUid', 'update:userName', 'update:email', 'update:isAnonymous', 'update:isLoggedIn'],
  data() {
    return {
      showMessage: false,
      message: '',
      uid: null,
      password: null,
      loggedIn: false,
      anonymous: true
    }
  },
  methods: {
    loginAnonymous() {
      const auth = getAuth()
      signInAnonymously(auth)
          .then((result) => {
            const user = result.user
            console.log('Login as anonymous ' + user.uid)
            logEvent(getAnalytics(), "login", {
              method: "Anonymous"
            })
          })
          .catch((error) => {
            this.message = 'Cannot login as anonymous: [' + error.code + '] ' + error.message
            console.log(this.message)
            this.showMessage = true
          });
    },
    loginByEmail() {
      const auth = getAuth()
      if (this.loggedIn && this.anonymous) {
        // TODO merge email account to anonymous
      } else {
        signInWithEmailAndPassword(auth, this.uid, this.password)
          .then((userCredential) => {
              const user = userCredential.user
              console.log('Login as ' + user.email)
              return userCredential
            }).catch((error) => {
              const errorCode = error.code
              const email = error.customData.email
              this.message = 'Cannot login ' + email + ': [' + errorCode + '] ' + error.message
              console.log(this.message)
              this.showMessage = true
            })
      }
    },
    loginByGoogle() {
      const provider = new GoogleAuthProvider();
      const auth = getAuth()
      if (this.loggedIn && this.anonymous) {
        // TODO merge google account to anonymous
      } else {
        signInWithPopup(auth, provider)
          .then((result) => {
              const user = result.user
              console.log('Login as ' + user.email)
              logEvent(getAnalytics(), "login", {
                method: "Google"
              })
              return user.uid
            }).catch((error) => {
              const errorCode = error.code
              const email = error.customData.email
              this.message = 'Cannot login ' + email + ': [' + errorCode + '] ' + error.message
              console.log(this.message)
              this.showMessage = true
            })
      }
    },
    loginByGithub()
    {
      const provider = new GithubAuthProvider();
      const auth = getAuth()
      if (this.loggedIn && this.anonymous) {
        // Fix merging accounts
        const oldUid = auth.currentUser.uid
        linkWithPopup(auth.currentUser, provider).then((result) => {
          console.log('Anonymous user ' + oldUid + ' linked to google user ' + result.user.email)
        }).catch((error) => {
          const errorCode = error.code
          const email = error.customData.email
          this.message = 'Cannot login ' + email + ': [' + errorCode + '] ' + error.message
          console.log(this.message)
          this.showMessage = true
        })
      } else {
        signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user
                console.log('Login as ' + user.email)
                logEvent(getAnalytics(), "login", {
                  method: "GitHub"
                })
                return user.uid
              }).catch((error) => {
                const errorCode = error.code
                const email = error.customData.email
                this.message = 'Cannot login ' + email + ': [' + errorCode + '] ' + error.message
                console.log(this.message)
                this.showMessage = true
              })
      }
    },
    logout() {
      const auth = getAuth()
      const oldUid = auth.currentUser.uid
      signOut(auth).then(() => {
        console.log('Singed out of ' + oldUid)
        this.message = 'Signed out'
        this.showMessage = true
        logEvent(getAnalytics(), 'logged_out')
      }).catch((error) => {
        const errorCode = error.code
        this.message = 'Cannot sign out ' + oldUid + ': [' + errorCode + '] ' + error.message
        console.log(this.message)
        this.showMessage = true
      })
    }
  },
  mounted() {
    const auth = getAuth()
    onAuthStateChanged(auth, (user) => {
      let userUid = ''
      if (user) {
        console.log('Authenticated: userName=' + user.displayName + ',userUid=' + user.uid + ',anonymous=' + user.isAnonymous)
        this.$emit('update:userUid', user.uid)
        this.$emit('update:userName', user.displayName)
        this.$emit('update:email', user.email)
        this.$emit('update:isLoggedIn', true)
        this.$emit('update:isAnonymous', user.isAnonymous)
        this.anonymous = user.isAnonymous
        this.loggedIn = true
        userUid = user.uid 
      } else {
        console.log('Logged out')
        this.$emit('update:userUid', null)
        this.$emit('update:userName', null)
        this.$emit('update:email', null)
        this.$emit('update:isLoggedIn', false)
        this.loggedIn = false
      }
      setUserId(getAnalytics(), userUid)
    })
  }
}
</script>

<style scoped>
</style>
