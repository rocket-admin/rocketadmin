import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { normalizeFieldName } from 'src/app/lib/normalize';

interface Blob {
  type: string,
  data: []
}

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.css']
})
export class FileComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: Blob;
  @Input() required: boolean;
  @Input() readonly: boolean;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public fileType;
  public hexData;
  public base64Data;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    if (this.value.data.length < 1024) {
      this.fileType = 'hex'
      this.hexData = Array.from(this.value.data, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
      }).join('')
    } else {
      this.base64Data = btoa(String.fromCharCode.apply(null, new Uint8Array(this.value.data)));
    };
    console.log(this.value);
  }

  onHexChange() {
    var hex = this.hexData.toString();
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    this.onFieldChange.emit(str);
  }

  onBase64Change() {
    const decodedData = atob(this.base64Data);
    this.onFieldChange.emit(decodedData);
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
