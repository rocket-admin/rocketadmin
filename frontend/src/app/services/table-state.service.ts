import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TableStateService {
  private state: any;

  setState(data: any) {
    this.state = data;
  }

  getState() {
    return this.state;
  }
}
