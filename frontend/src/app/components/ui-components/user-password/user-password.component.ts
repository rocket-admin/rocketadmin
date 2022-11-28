import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-user-password',
  templateUrl: './user-password.component.html',
  styleUrls: ['./user-password.component.css']
})
export class UserPasswordComponent implements OnInit {

  @Input() value: string;
  @Input() label: string;
  @Output() onFieldChange = new EventEmitter();

  public passwordHidden: boolean;

  constructor() { }

  ngOnInit(): void {
  }

}
