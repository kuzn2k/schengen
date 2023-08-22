import { defineStore } from 'pinia'

export const useAppStore = defineStore('appStore', {
    state: () => ({
        uid: null,
        name: null,
        email: null,
        isLoggedIn: false,
        isAnonymous: true,
        isVisaSelected: false,
        domesticCountry: null,
        visas: {},
        countries: [],
        abroad: false
    }),
    getters: {
        getVisaOrPermit: (state) => {
            return (zone) => state.visas[zone.toLowerCase()] || {}
        }
    },
    actions: {
        addVisa(zone, visa) {
            this.visas[zone.toLowerCase()] = visa
        },
        removeVisa(zone) {
            this.visas[zone.toLowerCase()] = null
        },
    }
})