export function codeSnippets(signingKey: string) {
    return {
        cs: {
            langName: 'C#',
            mode: 'csharp',
            snippet: `using System;
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

        var hmac = new HMACSHA256(Encoding.UTF8.GetBytes("${signingKey}"));
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
        },

        java: {
            langName: 'Java',
            mode: 'java',
            snippet: `import org.springframework.http.ResponseEntity;
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

        SecretKeySpec secretKeySpec = new SecretKeySpec("${signingKey}".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
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
        },

        php: {
          langName: 'PHP',
          mode: 'php',
          snippet: String.raw`<?php

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

        $hmac = hash_hmac('sha256', $bodyToJson, '${signingKey}');

        if (hash_equals($hmac, $rocketadminSignature)) {
            // your code
            return response()->json([], 200);
        } else {
            return response()->json(['error' => 'Signature invalid'], 400);
        }
    }
}`
        },

        go: {
          langName: 'Go',
          mode: 'go',
          snippet: `package main
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

        h := hmac.New(sha256.New, []byte("${signingKey}"))
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
        },

        python: {
          langName: 'Python',
          mode: 'python',
          snippet: `from django.http import JsonResponse
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

        hmac_obj = hmac.new(b'${signingKey}', body_to_json.encode(), hashlib.sha256)
        hash = hmac_obj.hexdigest()

        if constant_time_compare(hash, rocketadmin_signature):
            # your code
            return JsonResponse({}, status=200)
        else:
            return JsonResponse({'error': 'Signature invalid'}, status=400)
`
        },

        node: {
          langName: 'Node.js',
          mode: 'javascript',
          snippet: `const crypto = require("crypto");

app.use(express.json());

router.post("/rocketadmin", (req, res) => {
    const rocketadminSignature = req.headers["rocketadmin-signature"];
    const bodyData = req.body;

    const bodyToJson = JSON.stringify(bodyData);

    const hmac = crypto.createHmac("sha256", "${signingKey}");

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
