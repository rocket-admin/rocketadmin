import { Component, OnInit } from '@angular/core';
import { CustomAction, CustomActionType } from 'src/app/models/table';

import { ActionDeleteDialogComponent } from './action-delete-dialog/action-delete-dialog.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { MatDialog } from '@angular/material/dialog';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from 'src/app/lib/normalize';
import { unionBy } from "lodash";
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-db-table-actions',
  templateUrl: './db-table-actions.component.html',
  styleUrls: ['./db-table-actions.component.css']
})
export class DbTableActionsComponent implements OnInit {
  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string;
  public actions: CustomAction[];
  public submitting: boolean;
  public selectedAction: CustomAction = null;
  public updatedActionTitle: string;
  public newAction: CustomAction =null;
  public codeSnippet = '';
  public actionNameError: string;

  public defaultIcons = ['favorite_outline', 'star_outline', 'done', 'arrow_forward', 'key_outline', 'lock', 'visibility', 'language', 'notifications', 'schedule'];

  public codeLangSelected: string = 'cs';
  public codeSnippets = {
    cs: {
      langName: 'C#',
      mode: 'clike',
      snippet: `using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RocketadminController : ControllerBase
    {
        [HttpPost]
        public IActionResult Create([FromHeader] string RocketadminSignature, [FromBody] dynamic bodyData)
        {
            string[] yourTablePrimaryKeysNames = { "P_KEY_1", "P_KEY_2", "P_KEY_3" };
            string stringifyedPKeys = string.Join("\n", yourTablePrimaryKeysNames.Select(keyName => $"{keyName}::{bodyData[keyName]}"))
                .TrimEnd();

            string strTohash = $"{bodyData["$$_date"]}$\${stringifyedPKeys}$\${bodyData["$$_actionId"]}$\${bodyData["$$_tableName"]}";
            using (var hmac = new HMACSHA256("Your_Connection_Signing_Key"))
            {
                string hmacString = Encoding.UTF8.GetString(hmac.ComputeHash(Encoding.UTF8.GetBytes(strTohash)));
                if (hmacString != RocketadminSignature)
                {
                    return BadRequest("Signature invalid");
                }
            }

            // Your code here
            return Ok();
        }
    }
}
`
    },
    java: {
      langName: 'Java',
      mode: 'clike',
      snippet:`import java.util.Arrays;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RocketadminController {
    private static final String[] YOUR_TABLE_PRIMARY_KEYS_NAMES = {"P_KEY_1", "P_KEY_2", "P_KEY_3"};
    private static final String HMAC_SHA_256 = "HmacSHA256";
    private static final String YOUR_CONNECTION_SIGNING_KEY = "Your_Connection_Signing_Key";

    @PostMapping("/rocketadmin")
    public void handleRocketadmin(@RequestBody Map<String, String> bodyData) {
        String rocketadminSignature = bodyData.get("Rocketadmin-Signature");

        String stringifyedPKeys = Arrays.stream(YOUR_TABLE_PRIMARY_KEYS_NAMES)
                .map(key -> key + "::" + bodyData.get(key))
                .reduce((str1, str2) -> str1 + "\n" + str2)
                .orElse("");

        String strTohash = String.join("$$", bodyData.get("$$_date"), stringifyedPKeys, bodyData.get("$$_actionId"), bodyData.get("$$_tableName"));

        String hash = hmacSHA256(strTohash, YOUR_CONNECTION_SIGNING_KEY);
        if (hash.equals(rocketadminSignature)) {
            // Your code here
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature invalid");
        }
    }

    private static String hmacSHA256(String data, String key) {
        try {
            Mac hmac = Mac.getInstance(HMAC_SHA_256);
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes("UTF-8"), HMAC_SHA_256);
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes("UTF-8"));
            return DatatypeConverter.printHexBinary(hash).toLowerCase();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

      `
    },
    php: {
      langName: 'PHP',
      mode: 'php',
      snippet: `<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RocketadminController extends Controller
{
    public function create(Request $request)
    {
        $yourTablePrimaryKeysNames = ["P_KEY_1", "P_KEY_2", "P_KEY_3"];
        $rocketadminSignature = $request->header("Rocketadmin-Signature");
        $bodyData = $request->all();
        $primaryKeysValues = [];

        foreach ($yourTablePrimaryKeysNames as $keyName) {
            $primaryKeysValues[$keyName] = $bodyData[$keyName];
        }

        $stringifyedPKeys = "";
        foreach ($primaryKeysValues as $p => $val) {
            $stringifyedPKeys .= "$p::$val\n";
        }
        $stringifyedPKeys = rtrim($stringifyedPKeys);

        $strTohash = "{$bodyData['$$_date']}$$$stringifyedPKeys$\${$bodyData['$$_action_id']}$\${$bodyData['$$_table_name']}";
        $hmac = Hash::make("Your_Connection_Signing_Key" . $strTohash);

        if (Hash::check($rocketadminSignature, $hmac)) {
            // Your code here
            return response()->json(['result' => 'success']);
        } else {
            return response()->json(['error' => 'Signature invalid'], 400);
        }
    }
}
      `
    },
    ruby: {
      langName: 'Ruby',
      mode: 'ruby',
      snippet: `class RocketadminController < ApplicationController
  skip_before_action :verify_authenticity_token



  def create
    your_table_primary_keys_names = ["P_KEY_1", "P_KEY_2", "P_KEY_3"]
    rocketadmin_signature = request.headers["Rocketadmin-Signature"]
    body_data = request.POST
    primary_keys_values = {}

    your_table_primary_keys_names.each do |key_name|
      primary_keys_values[key_name] = body_data[key_name]
    end

    stringifyed_p_keys = primary_keys_values.map do |p, val|
      "#{p}::#{val}\n"
    end.join.chop

    str_to_hash = "#{body_data[:$$_date]}$$#{stringifyed_p_keys}$$#{body_data[:$$_action_id]}$$#{body_data[:$$_table_name]}"
    hmac = OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new("sha256"), "Your_Connection_Signing_Key", str_to_hash)

    if hmac == rocketadmin_signature
      # Your code here
    else
      render json: { error: "Signature invalid" }, status: :bad_request
    end
  end
end
      `
    },
    go: {
      langName: 'Go',
      mode: 'go',
      snippet: `package main

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "net/http"
  "strings"
)

func main() {
  http.HandleFunc("/rocketadmin", func(w http.ResponseWriter, r *http.Request) {
    if r.Method != "POST" {
      http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
      return
    }

    yourTablePrimaryKeysNames := []string{"P_KEY_1", "P_KEY_2", "P_KEY_3"}
    rocketadminSignature := r.Header.Get("Rocketadmin-Signature")
    bodyData := r.PostForm
    stringifyedPKeys := strings.Join(yourTablePrimaryKeysNames, "\n")
    strTohash := strings.Join([]string{bodyData.Get("$$_date"), stringifyedPKeys, bodyData.Get("$$_actionId"), bodyData.Get("$$_tableName")}, "$$")

    hmac := hmac.New(sha256.New, []byte("Your_Connection_Signing_Key"))
    hmac.Write([]byte(strTohash))
    hash := hex.EncodeToString(hmac.Sum(nil))
    if hash == rocketadminSignature {
      // Your code here
      w.WriteHeader(http.StatusOK)
    } else {
      w.WriteHeader(http.StatusBadRequest)
      w.Write([]byte("Signature invalid"))
    }
  })

  http.ListenAndServe(":3000", nil)
}
      `
    },
    python: {
      langName: 'Python',
      mode: 'python',
      snippet: `from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import hashlib

@method_decorator(csrf_exempt, name='dispatch')
class RocketadminView(View):
    def post(self, request):
        your_table_primary_keys_names = ["P_KEY_1", "P_KEY_2", "P_KEY_3"]
        rocketadmin_signature = request.headers["Rocketadmin-Signature"]
        body_data = request.POST
        primary_keys_values = {}

        for key_name in your_table_primary_keys_names:
            primary_keys_values[key_name] = body_data[key_name]

        stringifyed_p_keys = "".join(f"{p}::{val}\n" for p, val in primary_keys_values.items()).rstrip()
        str_to_hash = f"{body_data['$$_date']}$\${stringifyed_p_keys}$\${body_data['$$_action_id']}$\${body_data['$$_table_name']}"
        hmac = hashlib.sha256(f"Your_Connection_Signing_Key".encode() + str_to_hash.encode()).hexdigest()

        if hmac == rocketadmin_signature:
            # Your code here
            return JsonResponse({'result': 'success'}, status=200)
        else:
            return JsonResponse({'error': 'Signature invalid'}, status=400)
      `
    },
    node: {
      langName: 'Node.js',
      mode: 'javascript',
      snippet: `const app = express();
import { createHmac } from "crypto";

app.use(express.json());

app.post("/rocketadmin", (req, res) => {
  const [pKey1, pKey2, pKey3] = ["P_KEY_1", "P_KEY_2", "P_KEY_3"];
  const rocketadminSignature = req.headers["Rocketadmin-Signature"];
  const bodyData = req.body;
  const primaryKeysValues = {
    [pKey1]: bodyData[pKey1],
    [pKey2]: bodyData[pKey2],
    [pKey3]: bodyData[pKey3],
  };
  const stringifyedPKeys = Object.entries(primaryKeysValues)
    .map(([key, value]) => \`\${key}::\${value}\`)
    .join("\n");
  const strTohash = \`$\{bodyData["$$_date"]}\$\$\${stringifyedPKeys}$$\${bodyData["$$_actionId"]}$$\${bodyData["$$_tableName"]}\`;
  const hmac = createHmac("sha256", "Your_Connection_Signing_Key")\;
  hmac.update(strTohash);
  const hash = hmac.digest("hex");
  if (hash === rocketadminSignature) {
    // Your code here
    res.status(200).send();
  } else {
    res.status(400).send("Signature invalid");
  }
});

app.listen(3000, () => console.log("Running on port 8000"));
      `
    }
  }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    public dialog: MatDialog,
    private _notifications: NotificationsService
  ) { }

  async ngOnInit() {
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

    try {
      this.actions = await this.getActions();
      if (this.actions.length) this.setSelectedAction(this.actions[0]);
    } catch(error) {
      if (error instanceof HttpErrorResponse) {
        console.log(error.error.message);
      } else  { throw error };
    }

    this._tables.cast.subscribe(async (arg) =>  {
      if (arg === 'delete-action') {
        this.actions = this.actions.filter((action:CustomAction) => action.id !== this.selectedAction.id)
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = unionBy(undatedActions, this.actions, "title");
          if (this.actions.length) this.setSelectedAction(this.actions[0]);
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      }
    });
  }

  get currentConnection() {
    return this._connections.currentConnection;
  }

  getCrumbs(name: string) {
    return [
      {
        label: name,
        link: `/dashboard/${this.connectionID}`
      },
      {
        label: this.normalizedTableName,
        link: `/dashboard/${this.connectionID}/${this.tableName}`
      },
      {
        label: 'Actions',
        link: null
      }
    ]
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  setSelectedAction(action: CustomAction) {
    this.selectedAction = action;
    this.updatedActionTitle = action.title;
  }

  switchActionView(action: CustomAction) {
    this.setSelectedAction(action);
  }

  addNewAction() {
    this.newAction = {
      id: '',
      title: '',
      type: CustomActionType.Single,
      url: '',
      tableName: '',
      icon: '',
      requireConfirmation: false
    };
  }

  handleAddNewAction() {
    this.actionNameError = null;
    if (this.newAction.title === '') {
      this.actionNameError = 'The name cannot be empty.';
    } else {
      const coinsidingName = this.actions.find((action: CustomAction) => action.title === this.newAction.title);
      if (!coinsidingName) {
        this.selectedAction = {... this.newAction};
        this.updatedActionTitle = this.selectedAction.title;
        this.actions.push(this.selectedAction);
        this.newAction = null;
      } else {
        this.actionNameError = 'You already have an action with this name.'
      }
    }
  }

  undoAction() {
    this.newAction = null;
    if (this.actions.length) this.setSelectedAction(this.actions[0]);
  }

  handleRemoveAction() {
    if (this.selectedAction.id) {
      this.openDeleteActionDialog();
    } else {
      this.removeActionFromLocalList(this.selectedAction.title)
    }
  }

  removeActionFromLocalList(actionTitle: string) {
    this.actions = this.actions.filter((action: CustomAction)  => action.title != actionTitle);
    if (this.actions.length) this.setSelectedAction(this.actions[0]);
  }

  getActions() {
    return this._tables.fetchActions(this.connectionID, this.tableName).toPromise();
  }

  handleActionSubmetting() {
    if (this.selectedAction.id) {
      this.updateAction();
    } else {
      this.addAction();
    }
  }

  addAction() {
    this.submitting = true;
    if (!this.selectedAction.icon) this.selectedAction.icon = 'add_reaction';
    this._tables.saveAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = unionBy(undatedActions, this.actions, "title");
          const currentAction = this.actions.find((action: CustomAction) => action.id === res.id);
          this.setSelectedAction(currentAction);
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  updateAction() {
    this.submitting = true;
    if (this.updatedActionTitle) this.selectedAction.title = this.updatedActionTitle;
    this._tables.updateAction(this.connectionID, this.tableName, this.selectedAction)
      .subscribe(async (res) => {
        this.submitting = false;
        try {
          const undatedActions: CustomAction[] = await this.getActions();
          this.actions = this.actions.filter((action: CustomAction)  => action.title != this.selectedAction.id);
          this.actions = unionBy(undatedActions, this.actions, "title");
          const currentAction = this.actions.find((action: CustomAction) => action.id === res.id);
          this.selectedAction = {...currentAction};
        } catch(error) {
          if (error instanceof HttpErrorResponse) {
            console.log(error.error.message);
          } else  { throw error };
        }
      },
        () => this.submitting = false,
        () => this.submitting = false
      )
  }

  openDeleteActionDialog() {
    this.dialog.open(ActionDeleteDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.tableName,
        action: this.selectedAction
      }
    })
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
