<template>
  <v-container fluid>
    <v-card border density="comfortable">
      <v-card-title>
        Schengen Visa information
      </v-card-title>
      <v-card-subtitle v-if="!(allowedDays && expirationDate)">Please set expiration date and allowed days</v-card-subtitle>
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
        </v-card-text>
      </v-form>
      <v-divider></v-divider>
      <v-card-actions v-if="changed">
        <v-spacer></v-spacer>
        <v-btn
            icon
            :disabled="!valid || !changed"
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
import { doc, getDoc, setDoc } from "firebase/firestore"
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

export default {
  name: 'VisaInfo',
  components: { Datepicker },
  props: ['uid', 'db', 'collectionName'],
  emits: ['update:expirationDate', 'update:allowedDays', 'update:refresh'],
  data() {
    return {
      valid: true,
      changed: false,
      localExpirationDate: null,
      expirationDate: null,
      allowedDays: null,
      daysRules: [
        v => !!v || 'Number is required',
        v => (v && v.length >= 1 && v.length <= 2 && new RegExp('^[1-9][0-9]*$').test(v) && v <= 90) || 'Number is required and it should be no more than 90',
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
    this.loadData()
  },
  methods: {
    loadData() {
      if (this.uid != null && this.db != null && this.collectionName != null) {
        const docRef = doc(this.db, this.collectionName, this.uid);
        getDoc(docRef).then((docSnap) => {
          if (docSnap.exists()) {
            const visaInfo = docSnap.data()
            this.allowedDays = visaInfo.allowedDays
            this.localExpirationDate = null
            if (visaInfo.expirationDate) {
              this.expirationDate = new Date(visaInfo.expirationDate)
              this.localExpirationDate = new Date(this.expirationDate.getUTCFullYear(), this.expirationDate.getUTCMonth(), this.expirationDate.getUTCDate(), 23, 59, 59, 999)
            }
            console.log("Loaded document for " + this.uid + " (db=" + this.db + ")")
            console.log("Expiration date " + this.expirationDate)
          } else {
            this.expirationDate = null
            this.localExpirationDate = null
            this.allowedDays = null
            console.log("No journey information for " + this.uid)
          }
          this.$emit('update:expirationDate', this.expirationDate)
          this.$emit('update:allowedDays', this.allowedDays)
          this.$emit('update:refresh')
          this.changed = false
        })
      } else {
        console.log("Cannot get document for " + this.uid + " (db=" + this.db + ")")
      }
    },
    revert () {
      this.loadData()
    },
    save () {
      if (this.db != null && this.collectionName && this.uid != null ) {
        const ref = doc(this.db, this.collectionName, this.uid)
        let expirationDateMillis = this.expirationDate ? this.expirationDate.getTime() : null
        setDoc(ref, {
          allowedDays: this.allowedDays,
          expirationDate: expirationDateMillis
        }, { merge: true }).then(() => {
          this.$emit('update:expirationDate', this.expirationDate)
          this.$emit('update:allowedDays', this.allowedDays)
          console.log("Saved visa information for uid=" + this.uid)
          this.$emit('update:refresh')
          this.changed = false
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
