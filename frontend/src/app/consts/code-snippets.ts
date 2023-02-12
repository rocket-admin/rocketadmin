export function codeSnippen(signingKey: string) {

    return {
        cs: {
            langName: 'C#',
            mode: 'clike',
            snippet: {
                single: `
    using System.Linq;
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
                string[] yourTablePrimaryKeysNames = { "id" };
                string stringifiedPkeys = string.Join("\n", yourTablePrimaryKeysNames.Select(keyName => $"{keyName}::{bodyData[keyName]}"))
                    .TrimEnd();

                string strTohash = $"{bodyData["$$_date"]}$\${stringifiedPkeys}$\${bodyData["$$_actionId"]}$\${bodyData["$$_tableName"]}";
                using (var hmac = new HMACSHA256("${signingKey}"))
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
                `,
                multiple: `
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Security.Cryptography;
    using Microsoft.AspNetCore.Mvc;

    namespace RocketAdminController
    {
        [Route("api/[controller]")]
        [ApiController]
        public class RocketAdminController : ControllerBase
        {
            [HttpPost]
            public IActionResult Post([FromBody] Dictionary<string, string> bodyData)
            {
                string[] primaryKeys = { "id" };
                string rocketAdminSignature = Request.Headers["Rocketadmin-Signature"];
                List<Dictionary<string, string>> primaryKeyValuesArray = new List<Dictionary<string, string>>();
                foreach (string pKey in primaryKeys)
                {
                    primaryKeyValuesArray.Add(new Dictionary<string, string> { { pKey, bodyData[pKey] } });
                }
                string actionId = bodyData["$$_actionId"];
                string date = bodyData["$$_date"];
                string tableName = bodyData["$$_tableName"];
                string hash = GetRocketAdminSignature("${signingKey}", primaryKeyValuesArray, actionId, date, tableName);
                if (hash == rocketAdminSignature)
                {
                    // Your code here
                    return Ok();
                }
                else
                {
                    return BadRequest("Signature invalid");
                }
            }

            private string GetRocketAdminSignature(string signingKey, List<Dictionary<string, string>> primaryKeys, string actionId, string dateString, string tableName)
            {
                string stringifiedPrimaryKeys = string.Join("\n", primaryKeys.Select(x => string.Join("::", x.Select(y => y.Key + "::" + y.Value))));
                string strToHash = dateString + "$$" + stringifiedPrimaryKeys + "$$" + actionId + "$$" + tableName;
                using (HMACSHA256 hmac = new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(signingKey)))
                {
                    byte[] hashValue = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(strToHash));
                    return BitConverter.ToString(hashValue).Replace("-", string.Empty).ToLower();
                }
            }
        }
    }
                `
            }
        },

        java: {
            langName: 'Java',
            mode: 'clike',
            snippet: {
                single: `import java.util.Arrays;
    import java.util.Map;

    import javax.crypto.Mac;
    import javax.crypto.spec.SecretKeySpec;

    import org.springframework.http.HttpStatus;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    public class RocketadminController {
        private static final String[] YOUR_TABLE_PRIMARY_KEYS_NAMES = {"id"};
        private static final String HMAC_SHA_256 = "HmacSHA256";
        private static final String YOUR_CONNECTION_SIGNING_KEY = "${signingKey}";

        @PostMapping("/rocketadmin")
        public void handleRocketadmin(@RequestBody Map<String, String> bodyData) {
            String rocketadminSignature = bodyData.get("Rocketadmin-Signature");

            String stringifiedPkeys = Arrays.stream(YOUR_TABLE_PRIMARY_KEYS_NAMES)
                    .map(key -> key + "::" + bodyData.get(key))
                    .reduce((str1, str2) -> str1 + "\n" + str2)
                    .orElse("");

            String strTohash = String.join("$$", bodyData.get("$$_date"), stringifiedPkeys, bodyData.get("$$_actionId"), bodyData.get("$$_tableName"));

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

            `,
                multiple: `@RestController
    public class RocketadminController {

        private static final String SIGNING_KEY = "${signingKey}";
        private static final String[] PRIMARY_KEYS = {"id"};

        @PostMapping("/rocketadmin")
        public ResponseEntity<Void> handleRequest(@RequestHeader("Rocketadmin-Signature") String rocketadminSignature, @RequestBody Map<String, Object> bodyData) {
        Map<String, Object> primaryKeyValues = new HashMap<>();
        for (String pKey : PRIMARY_KEYS) {
            primaryKeyValues.put(pKey, bodyData.get(pKey));
        }

        String actionId = (String) bodyData.get("$$_actionId");
        String date = (String) bodyData.get("$$_date");
        String tableName = (String) bodyData.get("$$_tableName");

        String hash = getRocketadminSignature(primaryKeyValues, actionId, date, tableName);

        if (hash.equals(rocketadminSignature)) {
            // Your code here
            return new ResponseEntity<>(HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    private String getRocketadminSignature(Map<String, Object> primaryKeys, String actionId, String dateString, String tableName) {
        String stringifiedPKeys = objToString(primaryKeys);
        String strToHash = dateString + "$$" + stringifiedPKeys + "$$" + actionId + "$$" + tableName;
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(SIGNING_KEY.getBytes("UTF-8"), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(strToHash.getBytes("UTF-8"));
            return DatatypeConverter.printHexBinary(hash).toLowerCase();
        } catch (NoSuchAlgorithmException | InvalidKeyException | UnsupportedEncodingException e) {
            e.printStackTrace();
            return "";
        }
    }

    private String objToString(Map<String, Object> obj) {
        return obj.entrySet().stream()
            .map(entry -> entry.getKey() + "::" + entry.getValue().toString())
            .collect(Collectors.joining("\n"));
        }
    }
            `
            }
        },

        php: {
          langName: 'PHP',
          mode: 'php',
          snippet: {
            single: `<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RocketadminController extends Controller
{
    public function create(Request $request)
    {
        $yourTablePrimaryKeysNames = ["id"];
        $rocketadminSignature = $request->header("Rocketadmin-Signature");
        $bodyData = $request->all();
        $primaryKeysValues = [];

        foreach ($yourTablePrimaryKeysNames as $keyName) {
            $primaryKeysValues[$keyName] = $bodyData[$keyName];
        }

        $stringifiedPkeys = "";
        foreach ($primaryKeysValues as $p => $val) {
            $stringifiedPkeys .= "$p::$val\n";
        }
        $stringifiedPkeys = rtrim($stringifiedPkeys);

        $strTohash = "{$bodyData['$$_date']}$$$stringifiedPkeys$\${$bodyData['$$_action_id']}$\${$bodyData['$$_table_name']}";
        $hmac = Hash::make("${signingKey}" . $strTohash);

        if (Hash::check($rocketadminSignature, $hmac)) {
            // Your code here
            return response()->json(['result' => 'success']);
        } else {
            return response()->json(['error' => 'Signature invalid'], 400);
        }
    }
}
            `,
            multiple: `use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

Route::post('/rocketadmin', function (Request $request) {
    $pKey = "id";
    $rocketadminSignature = $request->header('Rocketadmin-Signature');
    $bodyData = $request->input('primaryKeys');
    $primaryKeyValuesArray = [
        [$pKey => $bodyData[$pKey]]
    ];
    $actionId = $bodyData["$$_actionId"];
    $date = $bodyData["$$_date"];
    $tableName = $bodyData["$$_tableName"];
    $hash = getRocketadminSignature("${signingKey}", $primaryKeyValuesArray, $actionId, $date, $tableName);

    if ($hash === $rocketadminSignature) {
    // Your code here
    return response(null, 200);
    } else {
    return response("Signature invalid", 400);
    }
});

function getRocketadminSignature($signingKey, $primaryKeys, $actionId, $dateString, $tableName) {
    $stringifyedPKeys = '';
    foreach ($primaryKeys as $pKeys) {
    $stringifyedPKeys .= objToString($pKeys);
    }
    $strTohash = $dateString . '$$' . $stringifyedPKeys . '$$' . $actionId . '$$' . $tableName;
    return hash_hmac('sha256', $strTohash, $signingKey);
}

function objToString($obj) {
    $str = '';
    foreach ($obj as $p => $val) {
    $str .= $p . '::' . $val . "\n";
    }
    return rtrim($str, "\n");
}
            `
            }
        },

        ruby: {
          langName: 'Ruby',
          mode: 'ruby',
          snippet: {
            single: `class RocketadminController < ApplicationController
skip_before_action :verify_authenticity_token

def create
    your_table_primary_keys_names = ["id"]
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
    hmac = OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new("sha256"), "${signingKey}", str_to_hash)

    if hmac == rocketadmin_signature
    # Your code here
    else
    render json: { error: "Signature invalid" }, status: :bad_request
    end
end
end
            `,
            multiple:`class RocketAdminController < ApplicationController
skip_before_action :verify_authenticity_token

def create
    p_key = %w[id]
    rocketadmin_signature = request.headers["Rocketadmin-Signature"]
    body_data = JSON.parse(request.body.read)["primaryKeys"]
    primary_key_values_array = [
        { p_key_1 => body_data[p_key] },
    ]
    action_id = body_data["$$_actionId"]
    date = body_data["$$_date"]
    table_name = body_data["$$_tableName"]
    hash = get_autoadmin_signature("${signingKey}", primary_key_values_array, action_id, date, table_name)

    if hash == rocketadmin_signature
    # Your code here
    render json: { success: true }, status: :ok
    else
    render json: { error: "Signature invalid" }, status: :bad_request
    end
end

private

def get_autoadmin_signature(signing_key, primary_keys, action_id, date_string, table_name)
    stringifyed_p_keys = primary_keys.map { |p_keys| obj_to_string(p_keys) }.join("\n")
    str_to_hash = "#{date_string}$$#{stringifyed_p_keys}$$#{action_id}$$#{table_name}"
    OpenSSL::HMAC.hexdigest("sha256", signing_key, str_to_hash)
end

def obj_to_string(obj)
    obj.map { |p, val| "#{p}::#{val}" }.join("\n")
end
end
            `
            }
        },

        go: {
          langName: 'Go',
          mode: 'go',
          snippet: {
            single: `package main

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

    yourTablePrimaryKeysNames := []string{"id"}
    rocketadminSignature := r.Header.Get("Rocketadmin-Signature")
    bodyData := r.PostForm
    stringifiedPkeys := strings.Join(yourTablePrimaryKeysNames, "\n")
    strTohash := strings.Join([]string{bodyData.Get("$$_date"), stringifiedPkeys, bodyData.Get("$$_actionId"), bodyData.Get("$$_tableName")}, "$$")

    hmac := hmac.New(sha256.New, []byte("${signingKey}"))
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
            `,
            multiple: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "net/http"
)

func RocketAdminHandler(w http.ResponseWriter, r *http.Request) {
    pKey := "id"
    rocketadminSignature := r.Header.Get("Rocketadmin-Signature")
    bodyData := r.PostFormValue("primaryKeys")
    primaryKeyValuesArray := []map[string]string{
        map[string]string{pKey: bodyData[pKey1]}
    }
    actionId := bodyData["$$_actionId"]
    date := bodyData["$$_date"]
    tableName := bodyData["$$_tableName"]
    hash := getRocketadminSignature("${signingKey}", primaryKeyValuesArray, actionId, date, tableName)

    if hash == rocketadminSignature {
        // Your code here
        w.WriteHeader(http.StatusOK)
    } else {
        http.Error(w, "Signature invalid", http.StatusBadRequest)
    }
}

func getRocketadminSignature(signingKey string, primaryKeys []map[string]string, actionId string, dateString string, tableName string) string {
    var stringifyedPKeys string
    for _, pKeys := range primaryKeys {
        stringifyedPKeys += objToString(pKeys)
    }
    strTohash := dateString + "$$" + stringifyedPKeys + "$$" + actionId + "$$" + tableName
    hmac := hmac.New(sha256.New, []byte(signingKey))
    hmac.Write([]byte(strTohash))
    return hex.EncodeToString(hmac.Sum(nil))
}

func objToString(obj map[string]string) string {
    var str string
    for p, val := range obj {
        str += p + "::" + val + "\n"
    }
    return str[:len(str)-1]
}

func main() {
    http.HandleFunc("/rocketadmin", RocketAdminHandler)
    http.ListenAndServe(":3000", nil)
}
            `
            }
        },

        python: {
          langName: 'Python',
          mode: 'python',
          snippet: {
            single: `from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import hashlib

@method_decorator(csrf_exempt, name='dispatch')
class RocketadminView(View):
    def post(self, request):
        your_table_primary_keys_names = ["id"]
        rocketadmin_signature = request.headers["Rocketadmin-Signature"]
        body_data = request.POST
        primary_keys_values = {}

        for key_name in your_table_primary_keys_names:
            primary_keys_values[key_name] = body_data[key_name]

        stringifyed_p_keys = "".join(f"{p}::{val}\n" for p, val in primary_keys_values.items()).rstrip()
        str_to_hash = f"{body_data['$$_date']}$\${stringifyed_p_keys}$\${body_data['$$_action_id']}$\${body_data['$$_table_name']}"
        hmac = hashlib.sha256(f"${signingKey}".encode() + str_to_hash.encode()).hexdigest()

        if hmac == rocketadmin_signature:
            # Your code here
            return JsonResponse({'result': 'success'}, status=200)
        else:
            return JsonResponse({'error': 'Signature invalid'}, status=400)
            `,
            multiple: `from django.http import JsonResponse
from django.views import View
import hmac
import hashlib

class RocketAdminView(View):
    def post(self, request):
        p_key = ["id"]
        rocketadmin_signature = request.META.get("Rocketadmin-Signature")
        body_data = request.body
        primary_key_values_array = [
            {p_key: body_data[p_key]}
        ]
        action_id = body_data["$$_actionId"]
        date = body_data["$$_date"]
        table_name = body_data["$$_tableName"]
        hash = get_autoadmin_signature(
            "${signingKey}",
            primary_key_values_array,
            action_id,
            date,
            table_name,
        )

        if hash == rocketadmin_signature:
            # Your code here
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"error": "Signature invalid"}, status=400)

def get_autoadmin_signature(signing_key, primary_keys, action_id, date_string, table_name):
    stringifyed_p_keys = "".join([obj_to_string(p_keys) for p_keys in primary_keys])
    str_to_hash = f"{date_string}$\${stringifyed_p_keys}$\${action_id}$\${table_name}"
    hmac_signature = hmac.new(signing_key.encode(), msg=str_to_hash.encode(), digestmod=hashlib.sha256)
    return hmac_signature.hexdigest()

def obj_to_string(obj):
    return "".join([f"{p}::{val}\n" for p, val in obj.items()])
            `
            }
        },

        node: {
          langName: 'Node.js',
          mode: 'javascript',
          snippet: {
            single: `const app = express();
import { createHmac } from "crypto";

app.use(express.json());

app.post("/rocketadmin", (req, res) => {
    const [pKey] = ["id"];
    const rocketadminSignature = req.headers["Rocketadmin-Signature"];
    const bodyData = req.body;
    const primaryKeysValues = {
        [pKey]: bodyData[pKey]
    };
    const stringifiedPkeys = Object.entries(primaryKeysValues)
    .map(([key, value]) => \`\${key}::\${value}\`)
    .join("");
    const strTohash = \`$\{bodyData["$$_date"]}\$\$\${stringifiedPkeys}$$\${bodyData["$$_actionId"]}$$\${bodyData["$$_tableName"]}\`;
    const hmac = createHmac("sha256", "${signingKey}")\;
    hmac.update(strTohash);
    const hash = hmac.digest("hex");
    if (crypto.timingSafeEqual(hash, rocketadminSignature)) {
    // Your code here
    res.status(200).send();
    } else {
    res.status(400).send("Signature invalid");
    }
});

app.listen(3000, () => console.log("Running on port 3000"));
            `,
            multiple: `
const app = express();
import { createHmac } from "crypto";
app.use(express.json());
​
app.post("/rocketadmin", (req, res) => {
    const [pKey] = ["id"] // primary keys of your table;
    const rocketadminSignature = req.headers["Rocketadmin-Signature"];
    const bodyData = req.body.primaryKeys;
    const primaryKeyValuesArray = [
        { [pKey]: bodyData[pKey] },
    ];
    const actionId = bodyData["$$_actionId"];
    const date = bodyData["$$_date"];
    const tableName = bodyData["$$_tableName"];
    const hash = getRocketadminSignature("${signingKey}", primaryKeyValuesArray, actionId, date, tableName);

    if (crypto.timingSafeEqual(hash, rocketadminSignature)) {
    // Your code here
    res.status(200).send();
    } else {
    res.status(400).send("Signature invalid");
    }
});

function getRocketadminSignature(
    signingKey,
    primaryKeys,
    actionId,
    dateString,
    tableName,
) {
    let stringifyedPKeys = '';
    for (const pKeys of primaryKeys) {
    stringifyedPKeys = objToString(pKeys);
    }
    const strTohash = dateString + '$$' + stringifyedPKeys + '$$' + actionId + '$$' + tableName;
    const hmac = createHmac('sha256', signingKey);
    hmac.update(strTohash);
    return hmac.digest('hex');
}

function objToString(obj) {
    return Object.entries(obj)
    .reduce((str, [p, val]) => {
        return \`\${str}\${p}::\${val}\n\`;
    }, '')
    .slice(0, -1);
}

app.listen(3000, () => console.log("Running on port 3000"));
            `
            }
        }
    }
}

