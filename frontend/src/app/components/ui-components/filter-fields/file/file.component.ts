import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { WidgetStructure } from 'src/app/models/table';
import { base64Validation } from 'src/app/validators/base64.validator';
import { hexValidation } from 'src/app/validators/hex.validator';
import { normalizeFieldName } from 'src/app/lib/normalize';

interface Blob {
  type: string,
  data: []
}

enum FileType {
  Hex = 'hex',
  Base64 = 'base64',
  File = 'file',
}

@Component({
  selector: 'app-filter-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.css']
})
export class FileFilterComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: Blob;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() widgetStructure: WidgetStructure;

  @Output() onFieldChange = new EventEmitter();

  static type = 'file';
  public isNotSwitcherActive;
  public normalizedLabel: string;
  public fileType: FileType = FileType.Hex;
  public hexData;
  public base64Data;
  public fileData;
  public fileURL: SafeUrl;
  public initError: string | null = null;

  constructor(
    private sanitazer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);

    if (this.widgetStructure && this.value) {
      this.fileType = this.widgetStructure.widget_params.type;

      if (this.fileType === 'hex') {
        this.hexData = this.value;
        //@ts-ignore
        this.initError = hexValidation()({value: this.hexData});
        this.initError = 'Invalid hex format.';
      };

      if (this.fileType === 'base64') {
        this.base64Data = this.value;
        //@ts-ignore
        this.initError = base64Validation()({value: this.hexData});
        this.initError = 'Invalid base64 format.';
      };

      if (this.fileType === 'file') {
        //@ts-ignore
        const blob = new Blob([this.value]);
        this.fileURL = this.sanitazer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      };
    };

    if (this.value) {
      this.hexData = this.value;
    }
  }

  convertValue(type: FileType) {
    if (this.hexData && type === FileType.Base64) {
      this.fromHexToBase64();
    }

    if (this.hexData && type === FileType.File) {
      this.fromHexToFile();
    }
  }

  onHexChange() {
    //@ts-ignore
    this.isNotSwitcherActive = hexValidation()({value: this.hexData});
    this.onFieldChange.emit(this.hexData);
  }

  onBase64Change() {
    this.fromBase64ToHex();
    this.onFieldChange.emit(this.hexData);
  }

  onFileSelected(event) {
    let reader = new FileReader();
    const file:File = event.target.files[0];

    reader.addEventListener("load", () => {
      this.fromFileToHex(reader);
      this.onFieldChange.emit(this.hexData);
    }, false);

    reader.readAsArrayBuffer(file);
  }

  fromHexToBase64() {
    this.base64Data = btoa(this.hexData.match(/\w{2}/g)
    .map(a => String.fromCharCode(parseInt(a, 16)))
    .join(""));
  }

  fromBase64ToHex() {
    try {
      const raw = atob(this.base64Data);
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        const hex = raw.charCodeAt(i).toString(16);
        result += (hex.length === 2 ? hex : '0' + hex);
      };
      this.hexData = result;
      this.isNotSwitcherActive = false;
    } catch(e) {
      this.isNotSwitcherActive = true;
    }
  }

  fromHexToFile() {
    const fileData = new Uint8Array(this.hexData.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    fileData.buffer;
    const blob = new Blob([fileData]);
    this.fileURL = this.sanitazer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
  }

  fromFileToHex(reader: FileReader) {
    let dataString = reader.result as ArrayBuffer;
    // let dataStringArray = new Array(dataString.byteLength);

    this.hexData = [...new Uint8Array(dataString)]
      .map(b => b.toString(16).padStart (2, "0"))
      .join("");
  }
}
