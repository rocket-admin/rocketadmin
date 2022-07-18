import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { normalizeFieldName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.css']
})
export class FileComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onFileSelected(event) {
    let reader = new FileReader();
    let dataString;
    const file:File = event.target.files[0];

    reader.addEventListener("load", () => {
      dataString = reader.result;
      if (dataString) {
        this.onFieldChange.emit(dataString);
      }
    }, false);

    reader.readAsBinaryString(file);
  }
}
