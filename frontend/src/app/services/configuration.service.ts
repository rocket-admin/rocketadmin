import { Injectable, Inject } from '@angular/core';
import config from "../../config.json";

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
    getConfig() {
      return config;
    }
}
