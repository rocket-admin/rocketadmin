import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

const easing = 'cubic-bezier(0.4, 0.0, 0.2, 1)';
const duration = '600ms';

export const toggleAnimation = trigger('toggle', [
  transition(':enter', [
    style({ height: 0, opacity: 0 }),
    query('.details', [
      style({ transform: 'translateY(-100%)' })
    ], { optional: true }),
    group([
      animate(`${duration} ${easing}`, style({ height: '*', opacity: 1 })),
      query('.details', [
        animate(`${duration} ${easing}`, style({ transform: 'translateY(0)' }))
      ], { optional: true })
    ])
  ]),
  transition(':leave', [
    style({ height: '*', opacity: 1 }),
    query('.details', [
      style({ transform: 'translateY(0)' })
    ], { optional: true }),
    group([
      animate(`${duration} ${easing}`, style({ height: 0, opacity: 0 })),
      query('.details', [
        animate(`${duration} ${easing}`, style({ transform: 'translateY(-100%)' }))
      ], { optional: true })
    ])
  ])
]);
