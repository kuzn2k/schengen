<template>
  <v-app>
    <v-app-bar :elevation="3">
      <v-spacer></v-spacer>
      <v-app-bar-title>
        <p class="text-right">{{ loggedUserTitle }}</p>
      </v-app-bar-title>
      <template v-slot:append>
        <AuthBar v-model:user-uid="userUid" v-model:user-name="userName" v-model:is-anonymous="isAnonymous" v-model:is-logged-in="isLoggedIn" v-model:email="email"/>
      </template>
    </v-app-bar>
    <v-main>
      <v-container fluid v-if="(isLoggedIn && userUid)">
        <v-row dense>
          <v-col>
            <v-row>
              <v-col>
                <VisaInfo :uid="userUid" :db="db" :collection-name="collectionName"
                               v-model:expiration-date="expirationDate"
                               v-model:allowed-days="allowedDays"/>
              </v-col>
            </v-row>
            <v-row>
              <v-col><MainInfo :uid="userUid" :db="db" :collection-name="collectionName"
                           :expiration-date="expirationDate" :allowed-days="allowedDays" :abroad="abroad"/></v-col>
            </v-row>
            <v-row v-if="expirationDate && allowedDays">
              <v-col><TripsList :uid="userUid" :db="db" :collection-name="collectionName" v-model:abroad="abroad"/></v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
      <v-container v-else>
        <p class="text-center">You need to login to view visa information and calculate days</p>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import AuthBar from './components/AuthBar.vue'
import VisaInfo from './components/VisaInfo.vue'
import MainInfo from './components/MainInfo.vue'
import TripsList from './components/TripsList.vue'

export default {
  name: 'App',
  components: {
    AuthBar,
    VisaInfo,
    MainInfo,
    TripsList
  },
  inject: ['database', 'collection'],
  data() {
    return {
      userUid: null,
      userName: null,
      email: null,
      expirationDate: null,
      allowedDays: null,
      abroad: null,
      isAnonymous: true,
      isLoggedIn: false,
      db: null,
      collectionName: null
    }
  },
  computed: {
    loggedUserTitle() {
      return this.isLoggedIn ? this.isAnonymous ? 'Anonymous' : (this.userName != null ? this.userName : '') + (this.email != null ? ' (' + this.email + ')' : '') : 'Please login =>'
    }
  },
  mounted() {
    console.log("Database " + this.database + ", collection: " + this.collection)
    this.db = this.database
    this.collectionName = this.collection
  },
  watch: {
    isLoggedIn(newState) {
      if (!newState) {
        this.expirationDate = null
        this.allowedDays = null
      }
    }
  }
}
</script>

<style>
</style>
