import { Component, NgZone, OnInit } from '@angular/core';

import { Router } from '@angular/router';

@Component({
  selector: 'app-page-loader',
  templateUrl: './page-loader.component.html',
  styleUrls: ['./page-loader.component.css']
})

export class PageLoaderComponent implements OnInit {

  constructor(
    public router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    // Hub.listen("auth", ({ payload: { event, data } }) => {
    //   switch (event) {
    //   case "signIn":
    //     this.ngZone.run(() => {
    //       this.router.navigate(['/connections-list']);
    //     })
    //   }
    // })
  }
}
