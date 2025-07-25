import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primevue/themes/aura'

// PrimeVue Components
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Card from 'primevue/card'
import Badge from 'primevue/badge'
import Menu from 'primevue/menu'
import InputSwitch from 'primevue/inputswitch'
import SelectButton from 'primevue/selectbutton'
import Chip from 'primevue/chip'
import Divider from 'primevue/divider'
import ScrollPanel from 'primevue/scrollpanel'
import Message from 'primevue/message'
import InlineMessage from 'primevue/inlinemessage'

// Import Tailwind first
import './style.css'
// PrimeIcons
import 'primeicons/primeicons.css'

import App from './App.vue'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false
    }
  },
  ripple: true
})
app.use(ToastService)
app.use(ConfirmationService)

// Register PrimeVue Components
app.component('Button', Button)
app.component('TabView', TabView)
app.component('TabPanel', TabPanel)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Dialog', Dialog)
app.component('InputText', InputText)
app.component('Dropdown', Dropdown)
app.component('Textarea', Textarea)
app.component('ProgressSpinner', ProgressSpinner)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)
app.component('Card', Card)
app.component('Badge', Badge)
app.component('Menu', Menu)
app.component('InputSwitch', InputSwitch)
app.component('SelectButton', SelectButton)
app.component('Chip', Chip)
app.component('Divider', Divider)
app.component('ScrollPanel', ScrollPanel)
app.component('Message', Message)
app.component('InlineMessage', InlineMessage)

app.mount('#app') 