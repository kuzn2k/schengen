<template>
  <v-container fluid v-if="expirationDate && allowedDays">
    <v-card border density="comfortable">
      <v-card-title v-if="abroad">
        Current trip
      </v-card-title>
      <v-card-title v-else>
        Next trip
      </v-card-title>
      <v-container v-if="abroad">
        <v-row>
          <v-col>Used days:</v-col><v-col>{{ spendDays }}</v-col>
        </v-row>
        <v-row>
          <v-col>Days in the rest:</v-col><v-col>{{ maxAllowedDays }}</v-col>
        </v-row>
        <v-row>
          <v-col>You must leave on:</v-col><v-col>{{ showUTCDate(dayToExit) }}</v-col>
        </v-row>
      </v-container>
      <v-container v-else>
        <v-row>
          <v-col>Used days:</v-col><v-col>{{ spendDays }}</v-col>
        </v-row>
        <v-row>
          <v-col>Days in the rest:</v-col><v-col>{{ maxAllowedDays }}</v-col>
        </v-row>
        <v-row>
          <v-col>You can enter on:</v-col><v-col>{{ showUTCDate(nextAllowedEnterDate) }}</v-col>
        </v-row>
        <v-row>
          <v-col>You must leave on:</v-col><v-col>{{ showUTCDate(dayToExit) }}</v-col>
        </v-row>      
      </v-container>
    </v-card>
    <v-card border density="comfortable">
      <v-card-title>Trip planning</v-card-title>
      <v-container>
        <v-row>
          <v-col cols="3">Desirable start date:</v-col>
          <v-col cols="9">
            <Datepicker v-model="desirableDate"
                        autoApply
                        required
                        :enableTimePicker="false"
                        :locale="userLocale"
                        :format="formatDate"
                        :previewFormat="formatDate"
                        prevent-min-max-navigation
                        :min-date="minDate"
                        :max-date="maxDate"
                        modelType="timestamp"/>
          </v-col>
        </v-row>
      </v-container>
      <v-container>
        <v-row>
          <v-col>You can enter on:</v-col><v-col>{{ showUTCDate(plannedTrip.tripStartDate) }}</v-col>
        </v-row>
        <v-row>
          <v-col>You must leave on:</v-col><v-col>{{ showUTCDate(plannedTrip.tripEndDate) }}</v-col>
        </v-row>
      </v-container>
    </v-card>
  </v-container>
  <v-container fluid v-else>
    Please fill visa information
  </v-container>
</template>

<script>

import {collection, orderBy, where, query, getDocs} from "firebase/firestore";
import Datepicker from '@vuepic/vue-datepicker';

export default {
  name: 'MainInfo',
  components: { Datepicker },
  props: ['uid', 'db', 'collectionName', 'expirationDate', 'allowedDays', 'abroad'],
  data() {
    return {
      desirableDate: null,
      plannedTrip: {},
      spendDays: null,
      maxAllowedDays: null,
      nextAllowedEnterDate: null,
      dayToExit: null,
      tripDurations: [],
      unsubscribe: null,
      userLocale: null,
      dayLength: 24 * 3600 * 1000,
      visaWindow: 180
    }
  },
  mounted() {
    this.userLocale =
        navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.language
  },
  unmounted() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  },
  computed: {
    minDate() {
      let now = new Date()
      now.setHours(0, 0, 0, 0)
      return now
    },
    maxDate() {
      let date
      if (this.expirationDate) {
        date = new Date(this.expirationDate.getUTCFullYear(), this.expirationDate.getUTCMonth(), this.expirationDate.getUTCDate(), 23, 59, 59, 999)
      } else {
        date = new Date()
        date.setHours(0, 0, 0, 0)
      }
      return date
    },
  }, 
  watch: {
    uid(newUid, oldUid) {
      if (newUid != null && newUid !== oldUid) {
        this.onChange(newUid)
      } else if (newUid == null) {
        if (this.unsubscribe) {
          this.unsubscribe()
          this.unsubscribe = null
        }
      }
      this.desirableDate = null
    },
    allowedDays(newDays, oldDays) {
      if (newDays !== oldDays && this.uid) {
        this.onChange(this.uid)
        this.desirableDate = null
      }
    },
    abroad(newFlaf, oldFlag) {
      if (oldFlag && newFlaf !== oldFlag && this.uid)
      {
        this.onChange(this.uid)
      }
    },
    async desirableDate(newPlannedDate, oldPlannedDate) {
      if (this.uid && newPlannedDate && newPlannedDate !== oldPlannedDate) {
        let startDate = new Date(newPlannedDate)
        this.plannedTrip = await this.calculatePlannedTrip(this.uid, new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)))
      } else {
        this.plannedTrip = {}
      }
    }
  },
  methods: {
    formatDate(date) {
      return date ? date.toLocaleDateString(this.userLocale) : ''
    },
    showUTCDate(date) {
      let print = ''
      if (date) {
        let localDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
        print = localDate.toLocaleDateString(this.userLocale)
      }
      return print
    },
    async calculatePlannedTrip(uid, startDate) {
      let tripInfo = {}
      if (this.db != null && this.collectionName != null && this.allowedDays) {
          const collectionRef = collection(this.db, this.collectionName, uid, "trips")
          const startOfToday = new Date(startDate.getTime())
          startOfToday.setUTCHours(0, 0, 0, 0)
          const endOfToday = new Date(startOfToday.getTime() + this.dayLength - 1)
          const startOfYesterday = new Date(startOfToday.getTime() - this.dayLength)
          const endOfYesterday = new Date(startOfYesterday.getTime() + this.dayLength - 1)
          const startTimeWindow = endOfYesterday.getTime() - this.visaWindow * this.dayLength + 1
          const tripsQuery = query(collectionRef, where("exit", ">=", startTimeWindow), orderBy("exit"))
          const pastTimeline = new Array(this.visaWindow)
          const daySpendTimeline = new Array(this.visaWindow)
          for (let i = 0; i < this.visaWindow; i++) {
            pastTimeline[i] = 0
            daySpendTimeline[i] = 0
          }

          tripInfo = await getDocs(tripsQuery)
                        .then((querySnap) => {
                          let spendDaysAtDate = 0
                          let allowedDaysAtDate = this.allowedDays
                          let nextAllowedEnterDayOffset = 0
                          let tripEndDayOffset = this.allowedDays - 1
                          let tripDuration = this.allowedDays
                          let tripAllowed = true
                          let nextTripEnterDate = new Date(startOfToday.getTime())
                          let nextTripLastDate = new Date(endOfToday.getTime() + tripEndDayOffset * this.dayLength)
                          if (!querySnap.empty) {
                            querySnap.docs.forEach((trip) => {
                              const tripData = trip.data()
                              const startTrip = tripData.entry < startTimeWindow ? startTimeWindow : tripData.entry
                              const endTrip = tripData.exit > endOfToday ? endOfToday : tripData.exit
                              let firstDayIdx = (startTrip - startTimeWindow) / this.dayLength
                              let lastDayIdx = (endTrip - (this.dayLength - 1) - startTimeWindow) / this.dayLength
                              for (let i = firstDayIdx; i <= lastDayIdx; i++) {
                                pastTimeline[i] = 1
                              }
                            })
                            for (let i = this.visaWindow - 1; i >=0; i--) {
                              spendDaysAtDate += pastTimeline[i]
                              daySpendTimeline[i] = spendDaysAtDate
                            }
                            allowedDaysAtDate = this.allowedDays - spendDaysAtDate
                            tripAllowed = false
                            for (let i = 0; i < this.visaWindow; i++) {
                              if (daySpendTimeline[i] < this.allowedDays) {
                                tripAllowed = true
                                tripDuration = 0
                                tripEndDayOffset = nextAllowedEnterDayOffset
                                if (nextAllowedEnterDayOffset > 0) {
                                  nextAllowedEnterDayOffset--
                                }
                                break
                              }
                              nextAllowedEnterDayOffset++
                            }
                            if (tripAllowed) {
                              tripDuration = 1
                              for (let i = tripEndDayOffset; i < this.visaWindow; i++) {
                                if (daySpendTimeline[i] + tripDuration > this.allowedDays) {
                                  tripDuration--
                                  tripEndDayOffset--
                                  break
                                }
                                tripDuration++
                                tripEndDayOffset++
                              }
                              if (tripEndDayOffset === this.visaWindow) {
                                // we reach right limit of visa window so previous trip has ended exactly at the last allowed day, making correction
                                tripEndDayOffset--
                              }
                              nextTripEnterDate = new Date(startOfToday.getTime() + nextAllowedEnterDayOffset * this.dayLength)
                              nextTripLastDate = new Date(endOfToday.getTime() + tripEndDayOffset * this.dayLength)
                            } else {
                              nextTripEnterDate = startOfToday
                              nextTripLastDate = startOfToday
                              console.log("Trip is not possible.  Violation visa rules within visa window")
                            }
                          }
                          return {
                                      allowed: tripAllowed,
                                      spendDays: spendDaysAtDate,
                                      allowedDays: allowedDaysAtDate,
                                      tripStartDate: nextTripEnterDate,
                                      tripEndDate: nextTripLastDate > this.expirationDate ? this.expirationDate : nextTripLastDate,
                                      duration: tripDuration
                                  }
                        })
                        .catch((error) => console.log("Get docs error: " + error.message))
      }
      return tripInfo
    },
    async onChange(uid) {
      let startDate = new Date()
      let currentInfo = await this.calculatePlannedTrip(uid, new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)))
      this.spendDays = currentInfo.spendDays
      this.maxAllowedDays = currentInfo.allowedDays
      if (currentInfo.allowed) {
        this.nextAllowedEnterDate = currentInfo.tripStartDate
        this.dayToExit = currentInfo.tripEndDate
      } else {
        this.nextAllowedEnterDate = null
        this.dayToExit = null
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
