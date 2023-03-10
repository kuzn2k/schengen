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
    src="https://cdn.vuetifyjs.com/images/backgrounds/vbanner.jpg"
  >
    <v-main>
      <v-container v-if="isLoggedIn && userUid">
        <v-row>
          <v-col><MainInfo ref="mainInfo" :uid="userUid" :db="db" :collection-name="collectionName"
                        :expiration-date="expirationDate" :allowed-days="allowedDays" :abroad="abroad"/></v-col>
        </v-row>
        <v-row>
          <v-col>
            <VisaInfo ref="visaInfo" :uid="userUid" :db="db" :collection-name="collectionName"
                            v-model:expiration-date="expirationDate"
                            v-model:allowed-days="allowedDays" @update:refresh="refresh"/>
          </v-col>
        </v-row>
        <v-row v-if="expirationDate && allowedDays">
          <v-col><TripsList :uid="userUid" :db="db" :collection-name="collectionName" v-model:abroad="abroad" @update:refresh="refresh"/></v-col>
        </v-row>
      </v-container>
      <v-container v-else>
        <div class="d-flex flex-column fill-height justify-center align-center text-white">
          <h1 class="text-h4 font-weight-thin mb-4">
            Visa days calculator
          </h1>
          <h4 class="subheading">
            You need to login to view visa information and calculate days
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
      return this.isLoggedIn ? this.isAnonymous ? 'Demo' : (this.userName != null ? this.userName : '') + (this.email != null ? ' (' + this.email + ')' : '') : 'Please login or click Demo=>'
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
