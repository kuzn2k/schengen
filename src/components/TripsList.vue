<template>
  <v-container fluid>
    <v-card border density="comfortable">
      <v-card-title>
        Your travel history
      </v-card-title>
      <v-card-subtitle>Add/Delete trips</v-card-subtitle>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn icon @click="addTrip">
          <v-icon icon="mdi-plus-circle-outline"></v-icon>
          <v-tooltip
            activator="parent"
            location="bottom"
          >Add</v-tooltip>  
        </v-btn>
      </v-card-actions>
      <v-card-text>
            <v-card border density="comfortable" v-for="item in trips" :key="item.idx">
              <v-card-text>
                <v-container fluid>
                  <v-row><v-col>From country:</v-col><v-col>{{ item.fromCountry?.name }}</v-col></v-row>
                  <v-row>
                    <v-col>Start date:</v-col>
                    <v-col>
                      <Datepicker v-model="item.localStart"
                                  required
                                  autoApply
                                  :disabled="!item.edit"
                                  :enableTimePicker="false"
                                  :locale="userLocale"
                                  :format="formatDate"
                                  :previewFormat="formatDate"
                                  modelType="timestamp"
                                  @update:modelValue="item.changed = true"/>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>To country:</v-col>
                    <v-col>
                      <v-select
                        v-model="item.toCountry"
                        :items="countries"
                        item-title="name"
                        item-value="id"
                        return-object
                        single-line
                        :disabled="!item.edit"
                        @update:modelValue="item.changed = true"
                      ></v-select>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>End date:</v-col>
                    <v-col>
                      <Datepicker v-model="item.localEnd"
                                  autoApply
                                  :disabled="!item.edit"
                                  :enableTimePicker="false"
                                  :locale="userLocale"
                                  :format="formatDate"
                                  :previewFormat="formatDate"
                                  modelType="timestamp"
                                  @update:modelValue="item.changed = true; item.abroad = !item.localEnd"
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>Return country:</v-col>
                    <v-col>
                      <v-select
                        v-model="item.returnCountry"
                        :items="countries"
                        item-title="name"
                        item-value="id"
                        return-object
                        single-line
                        :disabled="!item.edit"
                        @update:modelValue="item.changed = true"
                      ></v-select>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>
              <v-divider></v-divider>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn icon v-if="!item.edit" @click="editTrip(item)">
                  <v-icon icon="mdi-text-box-edit-outline"></v-icon>
                  <v-tooltip
                    activator="parent"
                    location="bottom"
                  >Change</v-tooltip>
                </v-btn>
                <v-btn icon v-if="item.changed" @click="saveTrip(item)">
                  <v-icon icon="mdi-content-save-outline"></v-icon>
                  <v-tooltip
                    activator="parent"
                    location="bottom"
                  >Save</v-tooltip>                    
                </v-btn>
                <v-btn icon v-if="item.edit" @click="revertTrip(item)">
                  <v-icon icon="mdi-cancel"></v-icon>
                  <v-tooltip
                    activator="parent"
                    location="bottom"
                  >Cancel</v-tooltip>                    
                </v-btn>
                <v-btn icon v-if="!item.new" @click="deleteTrip(item)">
                  <v-icon icon="mdi-trash-can-outline"></v-icon>
                  <v-tooltip
                    activator="parent"
                    location="bottom"
                  >Delete</v-tooltip>                    
                </v-btn>                    
              </v-card-actions>
            </v-card>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>

import {collection, query, orderBy, getDocs, updateDoc, addDoc, deleteDoc} from "firebase/firestore"
import Datepicker from "@vuepic/vue-datepicker"
import { getAnalytics, logEvent } from "firebase/analytics"
import { useAppStore } from '@/stores/appStore'
import { mapState } from 'pinia'

export default {
  name: 'TripInfo',
  components: { Datepicker },
  inject: ['database', 'collection'],
  props: ['zone'],
  emits: ['update:refresh'],
  data() {
    return {
      abroad: false,
      trips: [],
      userLocale: null
    }
  },
  mounted() {
    this.userLocale =
        navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.language
    this.loadData(this.uid)            
  },
  computed: {
    ...mapState(useAppStore, ['uid', 'countries', 'domesticCountry'])
  },
  watch: {
    uid(newUid, oldUid) {
      if (newUid != null && oldUid == null) {
        this.loadData(newUid)
      }
    }
  },
  methods: {
    loadData(uid) {
      if (uid != null && this.database != null && this.collection != null) {
        const collectionRef = collection(this.database, this.collection, uid, "trips")
        const tripsQuery = query(collectionRef, orderBy("exit", "desc"))
        getDocs(tripsQuery).then((querySnap) => {
          if (!querySnap.empty) {
            this.trips = []
            querySnap.docs.forEach((trip, index) => {
              const tripData = trip.data()
              let startDate = new Date(tripData.entry)
              let localStartDate = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0, 0)
              let endDate = null
              let localEndDate = null
              if (tripData.exit !== Number.MAX_VALUE) {
                endDate = new Date(tripData.exit)
                localEndDate = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999)  
              }
              const toCountry = this.countries.find((country) => country.id === tripData.toCountry)
              const returnCountry = this.countries.find((country) => country.id === tripData.returnCountry)
              this.trips.push({
                idx: index,
                oldStartDate: localStartDate,
                localStart: localStartDate,
                oldEndDate: localEndDate,
                localEnd: localEndDate,
                toCountry: toCountry,
                returnCountry: returnCountry,
                oldToCountry: toCountry,
                oldReturnCountry: returnCountry,
                changed: false,
                edit: false,
                abroad: tripData.exit === Number.MAX_VALUE || returnCountry ? returnCountry.id != this.domesticCountry.id : false,
                doc: trip.ref
              })
            })
            if (this.trips.length > 0) {
              let fromCountry = this.domesticCountry
              for (let i = this.trips.length - 1; i >= 0; i--) {
                this.trips[i].fromCountry = fromCountry
                fromCountry = this.trips[i].returnCountry
              }
            }
            console.log("Loaded trips for " + uid + " (count=" + this.trips.length + ")")
          } else {
            this.trips = []
            console.log("No trips information for " + uid)
          }
          const count = this.trips.length
          this.abroad = count > 0 ? this.trips[0].abroad : false
          useAppStore().abroad = this.abroad
        })
      } else {
        console.log("Cannot get document for " + uid + " (db=" + this.database + ")")
      }
    },
    formatDate(date) {
      return date.toLocaleDateString(this.userLocale)
    },
    editTrip(item) {
      item.edit = true
      item.changed = false
    },
    revertTrip(item) {
      item.edit = false
      item.changed = false
      if (item.new)
      {
        this.deleteItem(item)
      } else {
        item.localStart = item.oldStartDate
        item.localEnd = item.oldEndDate
        item.abroad = !item.localEnd || item.oldReturnCountry ? item.oldReturnCountry.id != this.domesticCountry.id : false
        item.returnCountry = item.oldReturnCountry
        item.toCountry = item.oldToCountry
      }
    },
    saveTrip(item) {
      const localStart = new Date(item.localStart)
      const startDay = new Date(Date.UTC(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0, 0))
      let endDay = null
      if (item.localEnd) {
        const localEnd = new Date(item.localEnd)
        endDay = new Date(Date.UTC(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 23, 59, 59, 999))
        item.abroad = item.returnCountry ? item.returnCountry.id != this.domesticCountry.id : false
      } else {
        item.localEnd = null
        item.abroad = true
      }
      const newData = {
        zone: item.toCountry ? item.toCountry.zone : this.zone.toLowerCase(),
        entry: startDay.getTime(),
        exit: !item.localEnd ? Number.MAX_VALUE : (endDay ? endDay.getTime() : null),
        returnCountry: item.returnCountry ? item.returnCountry.id : null,
        toCountry: item.toCountry ? item.toCountry.id : null
      }
      if (item.doc)
      {
        updateDoc(item.doc, newData).then(() => {
              console.log("Updated trip record: " + item.doc)
              item.changed = false
              item.edit = false
              this.abroad = item.abroad
              useAppStore().abroad = this.abroad
              this.$emit('update:refresh')
              logEvent(getAnalytics(), 'update_trip')
            }
        )
      } else {
        const collectionRef = collection(this.database, this.collection, this.uid, "trips")
        addDoc(collectionRef, newData).then((doc) => {
          item.doc = doc
          console.log("Created trip record: " + item.doc)
          item.changed = false
          item.edit = false
          item.new = false
          this.abroad = item.abroad
          useAppStore().abroad = this.abroad
          this.$emit('update:refresh')
          logEvent(getAnalytics(), 'add_trip')
        })
      }
    },
    addTrip() {
      const newIdx = 0
      const fromCountry = this.trips.length > 0 ? (this.trips[0].returnCountry ? this.trips[0].returnCountry : this.domesticCountry) : this.domesticCountry
      this.trips.splice(0, 0, {
        idx: newIdx,
        start: null,
        end: null,
        changed: false,
        edit: true,
        abroad: true,
        returnCountry: this.domesticCountry,
        fromCountry: fromCountry,
        new: true
      })
      this.restoreIndex(0)
    },
    deleteTrip(item) {
      if (item.doc) {
        deleteDoc(item.doc).then(() => {
          console.log("Deleted trip record: " + item.doc)
          this.deleteItem(item)
          const count = this.trips.length
          this.abroad = count > 0 ? this.trips[count - 1].abroad : false
          useAppStore().abroad = this.abroad
          this.$emit('update:refresh')
          logEvent(getAnalytics(), 'delete_trip')
        })
      } else {
        this.deleteItem(item)
      }
    },
    deleteItem(item) {
      const startIndex = item.idx
      this.trips.splice(startIndex, 1)
      this.restoreIndex(startIndex)
    },
    restoreIndex(startIndex) {
      if (startIndex < this.trips.length) {
        for (let i = startIndex; i < this.trips.length; i++) {
          this.trips[i].idx = i
        }
      }      
    }
  }
}
</script>

<style scoped>
</style>
