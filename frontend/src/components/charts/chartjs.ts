// Chart.js setup shared by the chart preview and the dashboard chart panel: what Angular's
// `provideCharts(withDefaultRegisterables())` and the `chartjs-adapter-date-fns` import did. Imported
// for its side effect by every component that renders a vue-chartjs <Chart>.
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);
