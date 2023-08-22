<template>
  <v-app>
    <v-app-bar :elevation="3">
      <v-spacer></v-spacer>
      <v-app-bar-title>
        <p class="text-right">{{ loggedUserTitle }}</p>
      </v-app-bar-title>
      <template v-slot:append>
        <AuthBar/>
      </template>
    </v-app-bar>
    <v-parallax
    src="/backgroud.jpg"
    >
      <v-main>
        <v-container v-if="isLoggedIn && userUid">
          <v-row>
            <v-col><MainInfo ref="mainInfo" :issuer="issuer"/></v-col>
          </v-row>
          <v-row>
            <v-col>
              <VisaInfo ref="visaInfo" :issuer="issuer" @update:refresh="refresh"/>
            </v-col>
          </v-row>
          <v-row v-if="isVisaSelected">
            <v-col><TripsList :zone="zone" @update:refresh="refresh"/></v-col>
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
              You need sign in to view visa information and calculate days
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
import { getAnalytics, logEvent } from 'firebase/analytics'
import { useHead } from 'unhead'
import { useAppStore } from '@/stores/appStore'
import { mapState } from 'pinia'

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
      abroad: null,
      zone: 'Schengen',
      issuer: 'Schengen'
    }
  },
  computed: {
    loggedUserTitle() {
      const appStore = useAppStore()
      return this.isLoggedIn ? appStore.isAnonymous ? 'Demo' : (appStore.name != null ? appStore.name : '') + (appStore.email != null ? ' (' + appStore.email + ')' : '') : 'Please sign in or click Demo =>'
    },
    ...mapState(useAppStore, ['isLoggedIn','isVisaSelected']),
    ...mapState(useAppStore, {
      userUid: 'uid'
    })
  },
  mounted() {
    console.log("Database " + this.database + ", collection: " + this.collection)
    const analytics = getAnalytics()
    logEvent(analytics, "page_view")
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
        useHead({
          title: 'Schengen visa days calculator | Welcome',
        })
        logEvent(analytics, "page_view")
        logEvent(analytics, "screen_view", {
          app_name: "web",
          screen_name: 'Welcome page',
          app_version: version
        })
      } else {
        useHead({
          title: this.zone,
        })
        logEvent(analytics, "page_view")
        logEvent(analytics, "screen_view", {
          app_name: "web",
          screen_name: 'Main ' + this.zone + ' page',
          app_version: version
        })
      }
    }
  },
  methods: {
    refresh() {
      this.$refs.mainInfo.onChange()
    }
  }
}
</script>

<style>
</style>
