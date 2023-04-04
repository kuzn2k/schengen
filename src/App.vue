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
    <v-parallax
    src="/backgroud.jpg"
    >
      <v-main>
        <v-container v-if="isLoggedIn && userUid">
          <v-row>
            <v-col><MainInfo ref="mainInfo" :uid="userUid" :db="db" :collection-name="collectionName"
                          :expiration-date="expirationDate" :allowed-days="allowedDays" :abroad="abroad"/></v-col>
          </v-row>
          <v-row>
            <v-col>
              <VisaInfo ref="visaInfo" :uid="userUid" :db="db" :collection-name="collectionName" :issuer="issuer"
                              v-model:expiration-date="expirationDate"
                              v-model:allowed-days="allowedDays" @update:refresh="refresh"/>
            </v-col>
          </v-row>
          <v-row v-if="expirationDate && allowedDays">
            <v-col><TripsList :uid="userUid" :db="db" :collection-name="collectionName" :zone="zone" v-model:abroad="abroad" @update:refresh="refresh"/></v-col>
          </v-row>
        </v-container>
        <v-container v-else>
          <div class="d-flex flex-column fill-height justify-center align-center text-white">
            <h1 class="text-h2 font-weight-thin mb-4">
              Visa days calculator
            </h1>
            <h2 class="text-h4 font-weight-thin mb-4">
              Track your travel days in Schengen countries to prevent visa violation
            </h2>
            <h4 class="subheading">
              You need sing in to view visa information and calculate days
            </h4>
          </div>
        </v-container>
      </v-main>
    </v-parallax>
  </v-app>
</template>

<script>
import AuthBar from './components/AuthBar.vue'
import VisaInfo from './components/VisaInfo.vue'
import MainInfo from './components/MainInfo.vue'
import TripsList from './components/TripsList.vue'
import { version } from '../package.json'
import { getAnalytics, logEvent } from "firebase/analytics"

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
      collectionName: null,
      zone: 'Schengen',
      issuer: 'Schengen'
    }
  },
  computed: {
    loggedUserTitle() {
      return this.isLoggedIn ? this.isAnonymous ? 'Demo' : (this.userName != null ? this.userName : '') + (this.email != null ? ' (' + this.email + ')' : '') : 'Please sing in or click Demo =>'
    }
  },
  mounted() {
    console.log("Database " + this.database + ", collection: " + this.collection)
    this.db = this.database
    this.collectionName = this.collection
    const analytics = getAnalytics()
    logEvent(analytics, "page_view");
    logEvent(analytics, "screen_view", {
        app_name: "web",
        screen_name: 'Welcome page',
        app_version: version
      })
  },
  watch: {
    isLoggedIn(newState) {
      const analytics = getAnalytics()
      if (!newState) {
        this.expirationDate = null
        this.allowedDays = null
        logEvent(analytics, "page_view");
        logEvent(analytics, "screen_view", {
          app_name: "web",
          screen_name: 'Welcome page',
          app_version: version
        })
      } else {
        logEvent(analytics, "page_view");
        logEvent(analytics, "screen_view", {
          app_name: "web",
          screen_name: 'Main schengen page',
          app_version: version
        })
      }

    }
  },
  methods: {
    refresh() {
      this.$refs.mainInfo.onChange(this.allowedDays, this.expirationDate)
    }
  }
}
</script>

<style>
</style>
