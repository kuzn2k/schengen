<template>
  <v-container fluid>
    <v-card border density="comfortable">
      <v-card-title>
        Visa information
      </v-card-title>
      <v-form ref="form"
              v-model="valid">
        <v-container>
          <v-row>
            <v-col>
              <v-row>
                <v-col cols="3">Expiration date:</v-col>
                <v-col cols="4">
                  <Datepicker v-model="localExpirationDate"
                              autoApply
                              required
                              :enableTimePicker="false"
                              :locale="userLocale"
                              :format="formatDate"
                              :previewFormat="formatDate"
                              modelType="timestamp"/>
                </v-col>
              </v-row>
            </v-col>
            <v-col cols="3">Allowed days:</v-col>
            <v-col cols="2">
              <v-text-field
                  v-model="allowedDays"
                  :rules="daysRules"
                  required
                  hint="Allowed staying days in Schengen within 180 days"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-form>

      <v-card-actions>
        <v-btn
            :disabled="!valid || !changed"
            color="success"
            @click="save"
        >
          Save
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
  emits: ['update:expirationDate', 'update:allowedDays'],
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
    uid(newUid, oldUid) {
      if (newUid != null && newUid !== oldUid) {
        this.loadData(newUid)
      }
    },
    allowedDays(newDays, oldDays) {
      this.changed = newDays !== oldDays
      if (this.changed) {
        this.$emit('update:allowedDays', this.allowedDays)
      }
    },
    localExpirationDate(newDate, oldDate) {
      this.changed = newDate !== oldDate
      if (this.changed) {
        if (newDate) {
          const newLocalDate = new Date(newDate)
          this.expirationDate = new Date(Date.UTC(newLocalDate.getFullYear(), newLocalDate.getMonth(), newLocalDate.getDate(), 23, 59, 59, 999))
        }
        else {
          this.expirationDate = null
        }
        this.$emit('update:expirationDate', this.expirationDate)
      }
    }
  },
  mounted() {
    this.userLocale =
        navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.language
    console.log("Locale=" + this.userLocale)
    this.loadData(this.uid)
  },
  methods: {
    loadData(uid) {
      if (uid != null && this.db != null && this.collectionName != null) {
        const docRef = doc(this.db, this.collectionName, uid);
        getDoc(docRef).then((docSnap) => {
          if (docSnap.exists()) {
            const visaInfo = docSnap.data()
            this.allowedDays = visaInfo.allowedDays
            this.localExpirationDate = null
            if (visaInfo.expirationDate) {
              this.expirationDate = new Date(visaInfo.expirationDate)
              this.localExpirationDate = new Date(this.expirationDate.getUTCFullYear(), this.expirationDate.getUTCMonth(), this.expirationDate.getUTCDate(), 23, 59, 59, 999)
            }
            console.log("Loaded document for " + uid + " (db=" + this.db + ")")
            console.log("Expiration date " + this.expirationDate)
          } else {
            this.expirationDate = null
            this.localExpirationDate = null
            this.allowedDays = null
            console.log("No journey information for " + uid)
          }
          this.$emit('update:expirationDate', this.expirationDate)
          this.$emit('update:allowedDays', this.allowedDays)
          this.changed = false
        })
      } else {
        console.log("Cannot get document for " + uid + " (db=" + this.db + ")")
      }
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
