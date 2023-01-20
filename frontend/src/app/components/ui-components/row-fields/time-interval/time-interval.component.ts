import pgInterval from "postgres-interval";

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { normalizeFieldName } from "../../../../lib/normalize";

@Component({
  selector: "app-time-interval",
  templateUrl: "./time-interval.component.html",
  styleUrls: ["./time-interval.component.css"],
})
export class TimeIntervalComponent implements OnInit {
  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public interval = {
    years: "",
    months: "",
    days: "",
    hours: "",
    minutes: "",
    seconds: "",
    milliseconds: "",
  };

  public normalizedLabel: string;

  constructor() {}

  ngOnInit(): void {
    // @ts-ignore
    if (this.value) this.interval = { ...pgInterval.parse(this.value) };
    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onInputChange() {
    // @ts-ignore
    const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
    this.onFieldChange.emit(currentInterval);
  }
}
