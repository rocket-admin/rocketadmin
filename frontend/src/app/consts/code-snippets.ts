export function codeSnippets(signingKey: string) {
    return {
        cs: {
            langName: 'C#',
            mode: 'clike',
            snippet: {
                single: `using System.Linq;
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
            multiple: `using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;

[Route("rocketadmin")]
[ApiController]
public class RocketAdminController : ControllerBase
{
    [HttpPost]
    public IActionResult Post([FromBody] dynamic bodyData)
    {
        string rocketadminSignature = Request.Headers["rocketadmin-signature"];

        string bodyToJson = Newtonsoft.Json.JsonConvert.SerializeObject(bodyData);

        var hmac = new HMACSHA256(Encoding.UTF8.GetBytes("your_rocketadmin_signing_key"));
        byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(bodyToJson));

        string hashString = BitConverter.ToString(hash).Replace("-", "").ToLower();

        if (hashString == rocketadminSignature)
        {
            // your code
            return Ok();
        }
        else
        {
            return BadRequest("Signature invalid");
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
                multiple: `import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/rocketadmin")
public class RocketAdminController {

    @PostMapping
    public ResponseEntity<String> handlePost(@RequestBody Map<String, Object> bodyData,
                                                @RequestHeader("rocketadmin-signature") String rocketadminSignature) throws NoSuchAlgorithmException, InvalidKeyException {
        String bodyToJson = new ObjectMapper().writeValueAsString(bodyData);

        SecretKeySpec secretKeySpec = new SecretKeySpec("your_rocketadmin_signing_key".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(bodyToJson.getBytes(StandardCharsets.UTF_8));

        String hashString = Base64.getEncoder().encodeToString(hash);

        if (MessageDigest.isEqual(hashString.getBytes(StandardCharsets.UTF_8), rocketadminSignature.getBytes(StandardCharsets.UTF_8))) {
            // your code
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.status(400).body("Signature invalid");
        }
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
            multiple: `<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RocketadminController extends Controller
{
    public function store(Request $request)
    {
        $rocketadminSignature = $request->header('rocketadmin-signature');
        $bodyData = $request->all();

        $bodyToJson = json_encode($bodyData);

        $hmac = hash_hmac('sha256', $bodyToJson, 'your_rocketadmin_signing_key');

        if (hash_equals($hmac, $rocketadminSignature)) {
            // your code
            return response()->json([], 200);
        } else {
            return response()->json(['error' => 'Signature invalid'], 400);
        }
    }
}`
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
            multiple:`require 'openssl'

class RocketadminController < ApplicationController
    skip_before_action :verify_authenticity_token

    def create
        rocketadmin_signature = request.headers['rocketadmin-signature']
        body_data = request.body.read

        body_to_json = body_data.to_json

        hmac = OpenSSL::HMAC.new('your_rocketadmin_signing_key', OpenSSL::Digest.new('sha256'))
        hmac.update(body_to_json)
        hash = hmac.hexdigest

        if ActiveSupport::SecurityUtils.secure_compare(hash, rocketadmin_signature)
            # your code
            render json: {}, status: :ok
        else
            render json: { error: 'Signature invalid' }, status: :bad_request
        end
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
    "encoding/json"
    "io/ioutil"
    "net/http"
)

func main() {
    http.HandleFunc("/rocketadmin", func(w http.ResponseWriter, r *http.Request) {
        rocketadminSignature := r.Header.Get("rocketadmin-signature")

        body, _ := ioutil.ReadAll(r.Body)
        var bodyData map[string]interface{}
        json.Unmarshal(body, &bodyData)

        bodyToJson, _ := json.Marshal(bodyData)

        h := hmac.New(sha256.New, []byte("your_rocketadmin_signing_key"))
        h.Write(bodyToJson)
        hash := hex.EncodeToString(h.Sum(nil))

        if hmac.Equal([]byte(hash), []byte(rocketadminSignature)) {
            // your code
            w.WriteHeader(http.StatusOK)
        } else {
            http.Error(w, "Signature invalid", http.StatusBadRequest)
        }
    })

    http.ListenAndServe(":8080", nil)
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
from django.views.decorators.csrf import csrf_exempt
from django.utils.crypto import constant_time_compare
import hashlib
import hmac
import json

@csrf_exempt
def rocketadmin(request):
    if request.method == 'POST':
        rocketadmin_signature = request.META.get('HTTP_ROCKETADMIN_SIGNATURE')
        body_data = json.loads(request.body)

        body_to_json = json.dumps(body_data)

        hmac_obj = hmac.new(b'your_rocketadmin_signing_key', body_to_json.encode(), hashlib.sha256)
        hash = hmac_obj.hexdigest()

        if constant_time_compare(hash, rocketadmin_signature):
            # your code
            return JsonResponse({}, status=200)
        else:
            return JsonResponse({'error': 'Signature invalid'}, status=400)
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
            multiple: `const crypto = require("crypto");

app.use(express.json());

router.post("/rocketadmin", (req, res) => {
    const rocketadminSignature = req.headers["rocketadmin-signature"];
    const bodyData = req.body;

    const bodyToJson = JSON.stringify(bodyData);

    const hmac = crypto.createHmac("sha256", "your_rocketadmin_signing_key");

    hmac.update(bodyToJson);
    const hash = hmac.digest("hex");

    if (
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(rocketadminSignature))
    ) {
    //your code
    } else {
    res.status(400).send("Signature invalid");
    }
});
`
            }
        }
    }
}

