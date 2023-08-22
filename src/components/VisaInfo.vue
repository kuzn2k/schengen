<template>
  <v-container fluid>
    <v-card border density="comfortable">
      <v-card-title>
        {{ issuer }} Visa information
      </v-card-title>
      <v-card-subtitle v-if="!(allowedDays && expirationDate)">Please set expiration date and allowed days</v-card-subtitle>
      <v-container>
        <v-form ref="form" v-model="valid">
          <v-card-text>
            <v-row>
              <v-col>Expiration date:</v-col>
              <v-col>
                <Datepicker v-model="localExpirationDate"
                            autoApply
                            required
                            :enableTimePicker="false"
                            :locale="userLocale"
                            :format="formatDate"
                            :previewFormat="formatDate"
                            modelType="timestamp"
                            @update:modelValue="changed = true"/>
              </v-col>
            </v-row>
            <v-row>
              <v-col>Allowed days:</v-col>
              <v-col>
                <v-text-field
                    v-model="allowedDays"
                    :rules="daysRules"
                    required
                    hint="Allowed staying days in Schengen within 180 days"
                    @update:modelValue="changed = true"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>Domestic country:</v-col>
              <v-col>
                <v-select
                    v-model="domesticCountry"
                    :items="countries"
                    item-title="name"
                    item-value="id"
                    label="Domestic country"
                    return-object
                    single-line
                    @update:modelValue="changed = true"
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-form>
      </v-container>
      <v-divider></v-divider>
      <v-card-actions v-if="changed">
        <v-spacer></v-spacer>
        <v-btn
            icon
            :disabled="!valid || !changed || !domesticCountry"
            @click="save"
        >
          <v-icon icon="mdi-content-save-outline"></v-icon>
          <v-tooltip
            activator="parent"
            location="bottom"
          >Save</v-tooltip> 
        </v-btn>
        <v-btn icon @click="revert">
          <v-icon icon="mdi-cancel"></v-icon>
          <v-tooltip
            activator="parent"
            location="bottom"
          >Cancel</v-tooltip>         
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import { collection, doc, getDoc, setDoc, query, orderBy, getDocs } from "firebase/firestore"
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { getAnalytics, logEvent } from 'firebase/analytics'
import { useAppStore } from '@/stores/appStore'
import {mapActions, mapState} from 'pinia'

export default {
  name: 'VisaInfo',
  components: { Datepicker },
  inject: ['database', 'collection', 'countriesCollection'],
  props: ['issuer'],
  emits: ['update:refresh'],
  data() {
    return {
      valid: true,
      changed: false,
      localExpirationDate: null,
      expirationDate: null,
      allowedDays: null,
      domesticCountry: null,
      countries: [],
      daysRules: [
        v => !!v || 'Number is required',
        v => (v && v >= 1 && v <= 90 && new RegExp('^[1-9][0-9]*$').test('' + v)) || 'Number is required and it should be positive and no more than 90',
      ],
      userLocale: null
    }
  },
  watch: {
    localExpirationDate(newDate, oldDate) {
      if (newDate !== oldDate) {
        if (newDate) {
          const newLocalDate = new Date(newDate)
          this.expirationDate = new Date(Date.UTC(newLocalDate.getFullYear(), newLocalDate.getMonth(), newLocalDate.getDate(), 23, 59, 59, 999))
        }
        else {
          this.expirationDate = null
        }
      }
    }
  },
  mounted() {
    this.userLocale =
        navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.language
    console.log("Locale=" + this.userLocale)
    this.loadCountries();
    this.loadData()
  },
  computed: {
    ...mapState(useAppStore, ['uid'])
  },
  methods: {
    ...mapActions(useAppStore, ['addVisa', 'removeVisa']),
    loadData() {
      const appStore = useAppStore()
      if (appStore.uid != null && this.database != null && this.collection != null) {
        const zone = this.issuer.toLowerCase()
        const docRef = doc(this.database, this.collection, appStore.uid);
        getDoc(docRef).then((docSnap) => {
          if (docSnap.exists()) {
            const visaInfo = docSnap.data()
            const issuerModifier = zone + "_"
            this.allowedDays = visaInfo[issuerModifier + "allowedDays"]
            this.localExpirationDate = null
            const visaExpirationDate = visaInfo[issuerModifier + "expirationDate"]
            if (visaExpirationDate) {
              this.expirationDate = new Date(visaExpirationDate)
              this.localExpirationDate = new Date(this.expirationDate.getUTCFullYear(), this.expirationDate.getUTCMonth(), this.expirationDate.getUTCDate(), 23, 59, 59, 999)
            }
            const countryId = visaInfo['domesticCountry']
            this.domesticCountry = this.countries.find((country) => country.id === countryId)
            console.log("Loaded document for " + appStore.uid + " (db=" + this.database + ")")
            console.log("Expiration date " + this.expirationDate)
          } else {
            this.expirationDate = null
            this.localExpirationDate = null
            this.allowedDays = null
            console.log("No data for " + appStore.uid)
          }
          appStore.$patch((state) => {
            if (this.expirationDate == null) {
              this.removeVisa(zone)
              state.isVisaSelected = false
            } else {
              this.addVisa(zone, {expirationDate: this.expirationDate, allowedDays: this.allowedDays})
              state.isVisaSelected = true
            }
            state.domesticCountry = this.domesticCountry
          })
          this.$emit('update:refresh')
          this.changed = false
        })
      } else {
        console.log("Cannot get document for " + appStore.uid + " (db=" + this.database + ")")
      }
    },
    loadCountries () {
      const appStore = useAppStore()
      this.countries = []
      const collectionRef = collection(this.database, this.countriesCollection)
      const cQuery = query(collectionRef, orderBy("name", "asc"))
      getDocs(cQuery).then((querySnap) => {
          if (!querySnap.empty) {
            querySnap.docs.forEach(country => {
              const countryData = country.data()
              this.countries.push({id: countryData.id, name: countryData.name, zone: countryData.zone})
            })
          } else {
            console.log("No countries")
          }
        })
      appStore.countries = this.countries
    },
    revert () {
      this.loadData()
    },
    save () {
      if (this.database != null && this.collection && this.uid != null ) {
        const appStore = useAppStore()
        const ref = doc(this.database, this.collection, this.uid)
        let expirationDateMillis = this.expirationDate ? this.expirationDate.getTime() : null
        const zone = this.issuer.toLowerCase()
        const issuerModifier = zone + "_"
        const data = {}
        data[issuerModifier + "allowedDays"] = this.allowedDays * 1
        data[issuerModifier + "expirationDate"] = expirationDateMillis
        data["domesticCountry"] = this.domesticCountry.id
        setDoc(ref, data, { merge: true }).then(() => {
          appStore.$patch((state) => {
            this.addVisa(zone, {expirationDate: this.expirationDate, allowedDays: this.allowedDays})
            state.domesticCountry = this.domesticCountry
            state.isVisaSelected = true
          })
          console.log("Saved visa information for uid=" + this.uid)
          this.$emit('update:refresh')
          this.changed = false
          logEvent(getAnalytics(), 'set_schengen_visa_info')
        })
      }
    },
    formatDate(date) {
      return date.toLocaleDateString(this.userLocale)
    }
  }
}
</script>

<style scoped>
</style>
