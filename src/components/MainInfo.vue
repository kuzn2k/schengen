<template>
  <v-container fluid v-if="expirationDate && allowedDays">
    <v-card border density="comfortable">
      <v-card-title v-if="abroad">
        <p v-if="!violation">
          Current journey
        </p>
        <p v-else>
          Visa violation
        </p>
      </v-card-title>
      <v-card-title v-else>
        Journey planning
      </v-card-title>
      <v-card-text>
        <v-container v-if="abroad">
          <v-row>
            <v-col>Already used days:</v-col><v-col>{{ spendDays }}</v-col>
          </v-row>
          <v-row v-if="!violation">
            <v-col>Days in the rest:</v-col><v-col>{{ maxAllowedDays }}</v-col>
          </v-row>
          <v-row v-if="!violation">
            <v-col>You must leave on:</v-col><v-col>{{ showUTCDate(dayToExit) }}</v-col>
          </v-row>
        </v-container>
        <v-container v-else>
          <v-row>
            <v-col>Already used days:</v-col><v-col>{{ spendDays }}</v-col>
          </v-row>
          <v-row>
            <v-col>Journey start date:</v-col>
            <v-col>
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
          <v-row>
            <v-col>Planned staying:</v-col>
            <v-col>
              <v-text-field
                  v-model="expectedDuration"
                  :rules="durationRules"
                  hint="Journey duration in days"
                  clearable
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col>Maximum duration (days):</v-col><v-col>{{ plannedTrip.duration }}</v-col>
          </v-row>
          <v-row>
            <v-col>You can enter on:</v-col><v-col>{{ showUTCDate(plannedTrip.tripStartDate) }}</v-col>
          </v-row>
          <v-row>
            <v-col>You must leave on:</v-col><v-col>{{ showUTCDate(plannedTrip.tripEndDate) }}</v-col>
          </v-row>
          <v-row>
            <v-col>Minimum of days after trip in the rest:</v-col><v-col>{{ plannedTrip.allowedDaysAfter }}</v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>

import {collection, orderBy, where, query, getDocs} from "firebase/firestore"
import Datepicker from '@vuepic/vue-datepicker'
import { debounce } from 'vue-debounce'

export default {
  name: 'MainInfo',
  components: { Datepicker },
  expose: ['onChange'],
  props: ['uid', 'db', 'collectionName', 'expirationDate', 'allowedDays', 'abroad'],
  data() {
    return {
      desirableDate: new Date(),
      expectedDuration: null,
      plannedTrip: {},
      spendDays: null,
      maxAllowedDays: null,
      dayToExit: null,
      tripDurations: [],
      userLocale: null,
      violation: false,
      dayLength: 24 * 3600 * 1000,
      visaWindow: 180,
      durationRules: [
        v => (v == null || v === '' || (new RegExp('^[1-9][0-9]*$').test(v) && v > 0 && v <= 90)) || 'Number is required and it should be no more than ' + this.allowedDays,
      ],
    }
  },
  mounted() {
    this.userLocale =
        navigator.languages && navigator.languages.length
            ? navigator.languages[0]
            : navigator.language
  },
  computed: {
    minDate() {
      let now = new Date()
      if (this.plannedTrip.violation && this.plannedTrip.tripStartDate)
      {
        now = this.plannedTrip.tripStartDate
      }
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
    desirableDate(newPlannedDate, oldPlannedDate) {
      if (this.uid && newPlannedDate && newPlannedDate !== oldPlannedDate) {
        this.updatePlan()
      }
    },
    expectedDuration(newValue, oldValue) {
      if (this.uid && this.desirableDate && newValue !== oldValue && (newValue == null || newValue == '' || (newValue > 0 && newValue <= this.allowedDays))) {
        debounce(() => this.updatePlan(), '400ms')()
      }
    }    
  },
  methods: {
    async updatePlan() {
        this.plannedTrip = await this.planTrip(this.desirableDate, this.expectedDuration)
    },
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
    async calculatePlannedTrip(uid, startDate, allowedDays, expirationDate, expectedDuration) {
      let tripInfo = {}
      if (this.db != null && this.collectionName != null && allowedDays && expirationDate) {
          const collectionRef = collection(this.db, this.collectionName, uid, "trips")
          const startOfToday = new Date(startDate.getTime())
          startOfToday.setUTCHours(0, 0, 0, 0)
          const endOfToday = new Date(startOfToday.getTime() + this.dayLength - 1)
          const startOfYesterday = new Date(startOfToday.getTime() - this.dayLength)
          const endOfYesterday = new Date(startOfYesterday.getTime() + this.dayLength - 1)
          const startTimeWindow = endOfYesterday.getTime() - this.visaWindow * this.dayLength + 1
          const tripsQuery = query(collectionRef, where("exit", ">=", startTimeWindow), orderBy("exit"))
          const bufSize = this.visaWindow * 2
          const pastTimeline = new Array(bufSize * 2)
          const daySpendTimeline = new Array(bufSize * 2)
          for (let i = 0; i < bufSize; i++) {
            pastTimeline[i] = 0
            daySpendTimeline[i] = 0
          }

          tripInfo = await getDocs(tripsQuery)
                        .then((querySnap) => {
                          let spendDaysAtDate = 0
                          let allowedEnterDayOffset = 0
                          let tripEndDayOffset = allowedDays - 1
                          let tripDuration = allowedDays
                          let tripEnterDate = new Date(startOfToday.getTime())
                          let tripLastDate = new Date(endOfToday.getTime() + tripEndDayOffset * this.dayLength)
                          let nextTripStartDate = new Date(startOfToday.getTime() + this.visaWindow * this.dayLength)
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
                            for (let i = 0; i < bufSize; i++) {
                              if (daySpendTimeline[i] < allowedDays) {
                                tripDuration = 0
                                tripEndDayOffset = allowedEnterDayOffset
                                if (allowedEnterDayOffset > 0) {
                                  allowedEnterDayOffset--
                                }
                                break
                              }
                              allowedEnterDayOffset++
                            }
                            tripDuration = 1
                            for (let i = tripEndDayOffset; i < bufSize; i++) {
                              if ((expectedDuration && (tripDuration > expectedDuration)) || (daySpendTimeline[i] + tripDuration > allowedDays)) {
                                tripDuration--
                                tripEndDayOffset--
                                break
                              }
                              tripDuration++
                              tripEndDayOffset++
                            }
                            if (tripEndDayOffset === bufSize) {
                              // we reached right limit of visa window so previous trip has ended exactly at the last allowed day, making correction
                              tripEndDayOffset--
                            }
                          }
                          if (startDate > expirationDate) {
                            return {
                                      violation: true,
                                      spendDays: spendDaysAtDate,
                                      duration: 0
                                  }
                          } else {
                            if (tripDuration <= expectedDuration) {
                                tripEnterDate = new Date(startOfToday.getTime() + allowedEnterDayOffset * this.dayLength)
                                tripLastDate = new Date(endOfToday.getTime() + tripEndDayOffset * this.dayLength)
                                if (tripLastDate > expirationDate) {
                                  const correction = (tripLastDate - expirationDate) /  this.dayLength
                                  tripDuration -= correction
                                  tripEndDayOffset -= correction
                                  tripLastDate = expirationDate
                                }
                              } else {
                                // TODO find new posible start/end date outside visa window
                              }

                            let usedDaysInRest = 0
                            for (let i = tripEndDayOffset; i < bufSize; i++) {
                              usedDaysInRest += pastTimeline[i]
                            }
                            let allowedDaysAfter = allowedDays - (usedDaysInRest + tripDuration)
                            nextTripStartDate = allowedDaysAfter > 0 ? new Date(tripEnterDate.getTime() + tripDuration * this.dayLength) : null
                            return {
                                      violation: false,
                                      spendDays: spendDaysAtDate,
                                      tripStartDate: tripEnterDate,
                                      tripEndDate: tripLastDate,
                                      duration: tripDuration,
                                      allowedDaysAfter: allowedDaysAfter,
                                      restDays: usedDaysInRest,
                                      nextTripStartDate: nextTripStartDate
                                  }
                          }
                        })
                        .catch((error) => console.log("Get docs error: " + error.message))
      }
      return tripInfo
    },
    async planTrip(newPlannedDate, duration) {
      let startDate = new Date(newPlannedDate)
      return this.calculatePlannedTrip(this.uid, new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)), this.allowedDays, this.expirationDate, duration)
    },
    async onChange(allowedDays, expirationDate) {
      let startDate = new Date()
      let currentInfo = await this.calculatePlannedTrip(this.uid, new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)), allowedDays, expirationDate, null)
      this.spendDays = currentInfo.spendDays
      this.maxAllowedDays = currentInfo.duration
      this.violation = currentInfo.violation
      this.dayToExit = currentInfo.violation ? null : currentInfo.tripEndDate
      if (!this.desirableDate)
      {
        this.plannedTrip = currentInfo
      } else {
        const journeyDate = new Date(this.desirableDate)
        if (startDate.getFullYear() !== journeyDate.getFullYear() || startDate.getMonth() !== journeyDate.getMonth() || startDate.getDate() !== journeyDate.getDate() || this.expectedDuration) {
          this.plannedTrip = await this.planTrip(this.desirableDate, this.expectedDuration)
        } else {
          this.plannedTrip = currentInfo
        }
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
