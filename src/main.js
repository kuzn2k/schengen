import { createApp } from 'vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import { md3 } from 'vuetify/blueprints'
import { createHead, useHead } from 'unhead'

import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
    apiKey: "AIzaSyARlr8VEVUS1tO0X51hH_GYFcXtO--mgGA",
    authDomain: "schengen-472c2.firebaseapp.com",
    projectId: "schengen-472c2",
    storageBucket: "schengen-472c2.appspot.com",
    messagingSenderId: "748455314674",
    appId: "1:748455314674:web:d3c595a8c44324023cfc6b",
    measurementId: "G-CCQ0J890TD"
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
getAnalytics(firebaseApp);
const database = getFirestore(firebaseApp)

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const head = createHead()
app.use(head)

useHead({
    title: 'Schengen visa days calculator | Welcome',
    meta: [
      { name: 'description', content: 'Track your schengen days to prevent visa violation' },
      { property: 'og:title', content: 'Schengen visa days calculator' },
    ],
  })

app.provide('database', database)
app.provide('collection', 'journeys')
app.provide('countriesCollection', 'countries')

const vuetify = createVuetify({
    components,
    directives,
    blueprint: md3
})
app.use(vuetify)

app.mount('#app')