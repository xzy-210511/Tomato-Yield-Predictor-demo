// Time-series form configuration shared between InputPage cleanup and GrowthTestPage.

export const INITIAL_TS_FORM = {
  startDay: '15',
  maturityDay: '66',
  ec: 'EC6',
  light: 'high light',
  tAirMean: '24.8',
  rhMean: '68.5',
  co2Mean: '440',
  parLampDaily: '560',
  lightOnHoursDaily: '8',
}

export const FIELD_INFO_TS = {
  startDay: 'Day after transplant where the recursive forecast begins.',
  maturityDay: 'Last day after transplant to forecast to.',
  ec: 'EC treatment label used by the time-series model.',
  light: 'Light treatment label used by the time-series model.',
  tAirMean: 'Locked daily mean air temperature used for all future days.',
  rhMean: 'Locked daily mean relative humidity used for all future days.',
  co2Mean: 'Locked daily mean CO2 concentration used for all future days.',
  parLampDaily: 'Locked daily lamp PAR used for the forecast window.',
  lightOnHoursDaily: 'Locked daily lamp-on hours used for the forecast window.',
}

export const TS_GROUPS = [
  {
    title: 'Forecast Window',
    iconName: 'Thermometer',
    iconColor: 'text-orange-500',
    fields: [
      { key: 'startDay', label: 'Start Day', unit: 'DAT', min: 0, max: 66, step: 1 },
      { key: 'maturityDay', label: 'Maturity Day', unit: 'DAT', min: 1, max: 90, step: 1 },
    ],
  },
  {
    title: 'Locked Environment',
    iconName: 'Wind',
    iconColor: 'text-sky-500',
    fields: [
      { key: 'tAirMean', label: 'Air Temp', unit: 'C', min: 10, max: 40, step: 0.1 },
      { key: 'rhMean', label: 'Humidity', unit: '%', min: 20, max: 100, step: 0.1 },
      { key: 'co2Mean', label: 'CO2', unit: 'ppm', min: 200, max: 2000, step: 10 },
      { key: 'parLampDaily', label: 'Lamp PAR', unit: 'daily', min: 0, max: 2000, step: 10 },
      { key: 'lightOnHoursDaily', label: 'Light Hours', unit: 'h', min: 0, max: 24, step: 0.5 },
    ],
  },
]

export const EC_OPTIONS = ['EC3', 'EC6']
export const LIGHT_OPTIONS = ['high light', 'med light', 'low light', 'no light']
