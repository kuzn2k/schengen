<template>
  <v-container fluid>
    <v-card border density="comfortable">
      <v-card-title>
        Your travel history
      </v-card-title>
      <v-card-subtitle>Add/Delete trips</v-card-subtitle>
      <v-card-text>
        <v-container fluid>
          <v-row>
            <v-col cols="12">
              <v-card border density="comfortable" v-for="item in trips" :key="item.idx">
                <v-card-text>
                  <v-container fluid>
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
                  </v-container>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn v-if="!item.edit" @click="editTrip(item)">
                    Edit
                  </v-btn>
                  <v-btn v-if="item.changed" @click="saveTrip(item)">
                    Save
                  </v-btn>
                  <v-btn v-if="item.edit" @click="revertTrip(item)">
                    Cancel
                  </v-btn>
                  <v-btn v-if="!item.new" @click="deleteTrip(item)">
                    Delete
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="addTrip">
          Add
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>

import {collection, query, orderBy, getDocs, updateDoc, addDoc, deleteDoc} from "firebase/firestore";
import Datepicker from "@vuepic/vue-datepicker";

export default {
  name: 'TripInfo',
  components: { Datepicker },
  props: ['uid', 'db', 'collectionName'],
  emits: ['update:abroad', 'update:refresh'],
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
  watch: {
    uid(newUid, oldUid) {
      if (newUid != null && oldUid == null) {
        this.loadData(newUid)
      }
    }
  },
  methods: {
    loadData(uid) {
      if (uid != null && this.db != null && this.collectionName != null) {
        const collectionRef = collection(this.db, this.collectionName, uid, "trips")
        const tripsQuery = query(collectionRef, orderBy("exit"))
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
              this.trips.push({
                idx: index,
                oldStartDate: localStartDate,
                localStart: localStartDate,
                oldEndDate: localEndDate,
                localEnd: localEndDate,
                changed: false,
                edit: false,
                abroad: tripData.exit === Number.MAX_VALUE,
                doc: trip.ref
              })
            })
            console.log("Loaded trips for " + uid + " (count=" + this.trips.length + ")")
          } else {
            this.trips = []
            console.log("No trips information for " + uid)
          }
          const count = this.trips.length
          this.abroad = count > 0 ? this.trips[count - 1].abroad : false
          this.$emit('update:abroad', this.abroad)
        })
      } else {
        console.log("Cannot get document for " + uid + " (db=" + this.db + ")")
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
        item.abroad = !item.localEnd
      }
    },
    saveTrip(item) {
      const localStart = new Date(item.localStart)
      const startDay = new Date(Date.UTC(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0, 0))
      let endDay = null
      if (item.localEnd) {
        const localEnd = new Date(item.localEnd)
        endDay = new Date(Date.UTC(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 23, 59, 59, 999))
      } else {
        item.localEnd = null
      }
      const newData = {
        entry: startDay.getTime(),
        exit: item.abroad ? Number.MAX_VALUE : (endDay ? endDay.getTime() : null)
      }
      if (item.doc)
      {
        updateDoc(item.doc, newData).then(() => {
              console.log("Updated trip record: " + item.doc)
              item.changed = false
              item.edit = false
              this.abroad = item.abroad
              this.$emit('update:abroad', this.abroad)
              this.$emit('update:refresh')
            }
        )
      } else {
        const collectionRef = collection(this.db, this.collectionName, this.uid, "trips")
        addDoc(collectionRef, newData).then((doc) => {
          item.doc = doc
          console.log("Created trip record: " + item.doc)
          item.changed = false
          item.edit = false
          item.new = false
          this.abroad = item.abroad
          this.$emit('update:abroad', this.abroad)
          this.$emit('update:refresh')
        })
      }
    },
    addTrip() {
      const newIdx = this.trips.length
      this.trips.push({
        idx: newIdx,
        start: null,
        end: null,
        changed: false,
        edit: true,
        abroad: true,
        new: true
      })
    },
    deleteTrip(item) {
      if (item.doc) {
        deleteDoc(item.doc).then(() => {
          console.log("Deleted trip record: " + item.doc)
          this.deleteItem(item)
          const count = this.trips.length
          this.abroad = count > 0 ? this.trips[count - 1].abroad : false
          this.$emit('update:abroad', this.abroad)
          this.$emit('update:refresh')
        })
      } else {
        this.deleteItem(item)
      }
    },
    deleteItem(item) {
      const startIndex = item.idx
      this.trips.splice(startIndex, 1)
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
