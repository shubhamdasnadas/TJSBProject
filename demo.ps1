# Parameters
$url = "http://localhost:8080/api_jsonrpc.php"
$token = "b7b3f30c91bf343ff7ea4b169e08c7746c7e1c166f0aefb7f2930921c6a7690b"

# Construct Headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json-rpc"
}

# Construct JSON-RPC Body
# Using 'extend' in the filter typically means requesting all properties 
$body = @{
    jsonrpc = "2.0"
    method  = "host.get"
    params  = @{
        output = "extend" 
        filter = @{
            # Add specific filter keys here if needed, e.g., host = "MyServer"
        }
    }
    id = 1
} | ConvertTo-Json

# Execute Request
try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    
    # Growth Mindset Check: Don't just look at the output; check for RPC-level errors
    if ($response.error) {
        Write-Error "API Error: $($response.error.message) - $($response.error.data)"
    } else {
        $response.result
    }
}
catch {
    Write-Error "Request failed: $_"
}









# Trigger.get request
$triggerBody = @{
    jsonrpc = "2.0"
    method  = "trigger.get"
    params  = @{
        output = "extend"
        hostids = "10770"
        # You can add additional filters here if needed
    }
    id = 2
} | ConvertTo-Json

try {
    $triggerResponse = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $triggerBody
    
    if ($triggerResponse.error) {
        Write-Error "API Error: $($triggerResponse.error.message) - $($triggerResponse.error.data)"
    } else {
        $triggerResponse.result
    }
}
catch {
    Write-Error "Request failed: $_"
}





# Item.get request
$itemBody = @{
    jsonrpc = "2.0"
    method  = "item.get"
    params  = @{
        output = "extend"
        hostids = "10770"
        # Add filters if needed, e.g., item keys or types
    }
    id = 3
} | ConvertTo-Json

try {
    $itemResponse = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $itemBody
    
    if ($itemResponse.error) {
        Write-Error "API Error: $($itemResponse.error.message) - $($itemResponse.error.data)"
    } else {
        $itemResponse.result
    }
}
catch {
    Write-Error "Request failed: $_"
}