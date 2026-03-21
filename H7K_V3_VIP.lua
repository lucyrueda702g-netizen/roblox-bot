-- H7K V3 VIP
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local http_request = (request) or (http and http.request) or (syn and syn.request)

-- CONFIG
local JSONBIN_ID  = "69bafe1ec3097a1dd5393c57"
local JSONBIN_KEY = "$2a$10$uEhSPoGoaSWmTr/64G8Lmea6joMA.sdRxVejpNifnVpuchaGwtGdq"
local PLACE_ID    = game.PlaceId
local WEBHOOK     = "https://discord.com/api/webhooks/1484673413761990677/vikSfuDRynsiVDJQ1w-oXzxPRJjk4tl5mfCeunDf7QlM44m0KZCloiCFy3QRD4crVBxz"
local SCAN_DELAY  = 0.1

-- COLORS — igual al ZL x Chocola
local C_BG      = Color3.fromRGB(28, 28, 42)
local C_BG2     = Color3.fromRGB(20, 20, 34)
local C_HEADER  = Color3.fromRGB(35, 35, 55)
local C_BLUE    = Color3.fromRGB(70, 130, 255)
local C_GREEN   = Color3.fromRGB(0, 210, 110)
local C_WHITE   = Color3.fromRGB(255, 255, 255)
local C_MUTED   = Color3.fromRGB(150, 150, 175)
local C_YELLOW  = Color3.fromRGB(255, 210, 50)
local C_RED     = Color3.fromRGB(255, 70, 70)
local C_TICK    = Color3.fromRGB(50, 200, 100)

-- STATE
local scanning   = true
local minProd    = 10000000
local notified   = {}
local bestServer = nil
local bestName   = ""
local bestCash   = 0
local totalFound = 0

local PRIORITY = {
    ["Strawberry Elephant"]=1,["Meowl"]=2,["Skibidi Toilet"]=3,
    ["Headless Horseman"]=4,["La Supreme Combinasion"]=5,
    ["Dragon Gingerini"]=6,["Dragon Cannelloni"]=7,
    ["Hydra Dragon Cannelloni"]=8,["Cerberus"]=9,
    ["Ketupat Bros"]=10,["Burguro And Fryuro"]=11,
    ["Rosey and Teddy"]=12,["Popcuru and Fizzuru"]=13,
    ["Capitano Moby"]=14,["Cooki and Milki"]=15,
    ["Reinito Sleighito"]=16,["Love Love Bear"]=17,
    ["Ginger Gerat"]=18,["La Casa Boo"]=19,
    ["Fragrama and Chocrama"]=20,["Spooky and Pumpky"]=21,
    ["La Secret Combinasion"]=22,["Los Spaghettis"]=23,
    ["Lavadorito Spinito"]=28,["Ketchuru and Musturu"]=29,
    ["Rosetti Tualetti"]=30,["Orcaledon"]=31,
    ["Spinny Hammy"]=71,["Spaghetti Tualetti"]=58,
    ["Bacuru and Egguru"]=55,["Tralaledon"]=43,
}

local function normalizeName(n)
    return n:lower():gsub("^%s+",""):gsub("%s+$",""):gsub("%s+"," ")
end

local function parseProduction(text)
    local n, u = text:match("%$([%d%.]+)%s*([MBTKQmbtk])%s*/s")
    if not n then return end
    n = tonumber(n); if not n then return end
    local ul = u:upper()
    if ul=="K" then return n*1e3
    elseif ul=="M" then return n*1e6
    elseif ul=="B" then return n*1e9
    elseif ul=="T" then return n*1e12
    elseif ul=="Q" then return n*1e15 end
end

local function formatMoney(v)
    if not v then return "?" end
    if v>=1e15 then return string.format("$%.2fQ/s",v/1e15)
    elseif v>=1e12 then return string.format("$%.2fT/s",v/1e12)
    elseif v>=1e9 then return string.format("$%.2fB/s",v/1e9)
    elseif v>=1e6 then return string.format("$%.2fM/s",v/1e6)
    else return string.format("$%.0f/s",v) end
end

local function scanLocal()
    local list = {}
    local seen = {}
    for _, ui in ipairs(workspace:GetDescendants()) do
        if ui:IsA("TextLabel") then
            local value = parseProduction(ui.Text)
            if value and value >= minProd then
                local parent = ui.Parent
                for _, c in ipairs(parent:GetChildren()) do
                    if c:IsA("TextLabel") and not c.Text:find("%$") and c.Text ~= "" then
                        local key = normalizeName(c.Text).."|"..tostring(math.floor(value))
                        if not seen[key] then
                            seen[key] = true
                            table.insert(list, { name=c.Text, value=value })
                        end
                        break
                    end
                end
            end
        end
    end
    table.sort(list, function(a,b)
        local pa = PRIORITY[a.name] or math.huge
        local pb = PRIORITY[b.name] or math.huge
        if pa==pb then return a.value>b.value end
        return pa<pb
    end)
    return list
end

local function sendToDiscord(body)
    local url = WEBHOOK:gsub("https://discord.com/api/webhooks/","https://webhook.lewistehminerz.dev/api/webhooks/")
    pcall(function()
        if http_request then
            http_request({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})
        else
            HttpService:RequestAsync({Url=url,Method="POST",Headers={["Content-Type"]="application/json"},Body=body})
        end
    end)
end

local function saveJsonbin(name, cash, id)
    pcall(function()
        HttpService:RequestAsync({
            Url="https://api.jsonbin.io/v3/b/"..JSONBIN_ID,
            Method="PUT",
            Headers={["Content-Type"]="application/json",["X-Master-Key"]=JSONBIN_KEY},
            Body=HttpService:JSONEncode({servers={{
                id=id,brainrot=name,cash=cash,
                players="?/?",fps="?",ping="?",timestamp=os.time()
            }}})
        })
    end)
end

-- ══════════════════════════════════════════
--  GUI — estilo ZL x Chocola
-- ══════════════════════════════════════════
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "H7K_VIP"
ScreenGui.ResetOnSpawn = false
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui.IgnoreGuiInset = true
ScreenGui.Parent = playerGui

-- TP TO BEST button (esquina superior derecha como ZL)
local TpBtn = Instance.new("TextButton", ScreenGui)
TpBtn.Size = UDim2.new(0, 130, 0, 28)
TpBtn.Position = UDim2.new(1, -138, 0, 8)
TpBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 65)
TpBtn.BorderSizePixel = 0
TpBtn.Text = "Tp to Best  (X)"
TpBtn.TextColor3 = C_WHITE
TpBtn.TextSize = 11
TpBtn.Font = Enum.Font.GothamBold
Instance.new("UICorner", TpBtn).CornerRadius = UDim.new(0, 6)
local tpStroke = Instance.new("UIStroke", TpBtn)
tpStroke.Color = C_BLUE; tpStroke.Thickness = 1.2

-- MAIN HUB FRAME
local Hub = Instance.new("Frame", ScreenGui)
Hub.Size = UDim2.new(0, 240, 0, 110)
Hub.Position = UDim2.new(0.5, -120, 0, 45)
Hub.BackgroundColor3 = C_BG
Hub.BorderSizePixel = 0
Hub.ClipsDescendants = true
Instance.new("UICorner", Hub).CornerRadius = UDim.new(0, 8)
local hubStroke = Instance.new("UIStroke", Hub)
hubStroke.Color = C_BLUE; hubStroke.Thickness = 1.5

-- HEADER
local Header = Instance.new("Frame", Hub)
Header.Size = UDim2.new(1, 0, 0, 28)
Header.BackgroundColor3 = C_HEADER
Header.BorderSizePixel = 0

-- Title "H7K V3 VIP"
local TitleLbl = Instance.new("TextLabel", Header)
TitleLbl.Size = UDim2.new(1, -60, 1, 0)
TitleLbl.Position = UDim2.new(0, 10, 0, 0)
TitleLbl.BackgroundTransparency = 1
TitleLbl.Text = "H7K V3 VIP"
TitleLbl.TextColor3 = C_WHITE
TitleLbl.TextSize = 12; TitleLbl.Font = Enum.Font.GothamBold
TitleLbl.TextXAlignment = Enum.TextXAlignment.Left
-- Rainbow title
task.spawn(function()
    while TitleLbl.Parent do
        TitleLbl.TextColor3 = Color3.fromHSV(os.clock()*0.3%1,1,1)
        task.wait(0.03)
    end
end)

-- Counter badge (número de brainrots encontrados)
local CountBadge = Instance.new("TextLabel", Header)
CountBadge.Size = UDim2.new(0, 28, 0, 18)
CountBadge.Position = UDim2.new(1, -32, 0.5, -9)
CountBadge.BackgroundColor3 = C_BLUE
CountBadge.BorderSizePixel = 0
CountBadge.Text = "0"
CountBadge.TextColor3 = C_WHITE
CountBadge.TextSize = 10; CountBadge.Font = Enum.Font.GothamBold
Instance.new("UICorner", CountBadge).CornerRadius = UDim.new(0, 4)

-- DRAG header
local DragBtn = Instance.new("TextButton", Header)
DragBtn.Size = UDim2.new(1,-40,1,0); DragBtn.BackgroundTransparency=1; DragBtn.Text=""; DragBtn.ZIndex=10
local dragging,dragStart,startPos=false,nil,nil
DragBtn.InputBegan:Connect(function(i)
    if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
        dragging=true; dragStart=i.Position; startPos=Hub.Position
        i.Changed:Connect(function() if i.UserInputState==Enum.UserInputState.End then dragging=false end end)
    end
end)
UserInputService.InputChanged:Connect(function(i)
    if dragging and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then
        local d=i.Position-dragStart
        Hub.Position=UDim2.new(startPos.X.Scale,startPos.X.Offset+d.X,startPos.Y.Scale,startPos.Y.Offset+d.Y)
    end
end)

-- BODY
local Body = Instance.new("Frame", Hub)
Body.Size = UDim2.new(1, 0, 1, -28)
Body.Position = UDim2.new(0, 0, 0, 28)
Body.BackgroundTransparency = 1

-- MIN PRODUCTION row (como el "M: 100" del ZL)
local MinRow = Instance.new("Frame", Body)
MinRow.Size = UDim2.new(1, -12, 0, 26)
MinRow.Position = UDim2.new(0, 6, 0, 6)
MinRow.BackgroundColor3 = C_BG2
MinRow.BorderSizePixel = 0
Instance.new("UICorner", MinRow).CornerRadius = UDim.new(0, 6)

local MLbl = Instance.new("TextLabel", MinRow)
MLbl.Size = UDim2.new(0, 20, 1, 0); MLbl.Position = UDim2.new(0, 6, 0, 0)
MLbl.BackgroundTransparency = 1; MLbl.Text = "M:"
MLbl.TextColor3 = C_MUTED; MLbl.TextSize = 10; MLbl.Font = Enum.Font.GothamBold

local MinBox = Instance.new("TextBox", MinRow)
MinBox.Size = UDim2.new(0, 50, 0, 20)
MinBox.Position = UDim2.new(0, 26, 0.5, -10)
MinBox.BackgroundColor3 = Color3.fromRGB(40, 40, 60)
MinBox.BorderSizePixel = 0
MinBox.Text = "10"
MinBox.TextColor3 = C_WHITE; MinBox.TextSize = 10; MinBox.Font = Enum.Font.GothamBold
MinBox.ClearTextOnFocus = false
Instance.new("UICorner", MinBox).CornerRadius = UDim.new(0, 4)
MinBox.FocusLost:Connect(function()
    local v = tonumber(MinBox.Text)
    if v and v > 0 then
        minProd = v * 1e6
        MinBox.Text = tostring(v)
    else
        MinBox.Text = "10"
        minProd = 10e6
    end
end)

-- Checkmark button (toggle scan)
local CheckBtn = Instance.new("TextButton", MinRow)
CheckBtn.Size = UDim2.new(0, 26, 0, 20)
CheckBtn.Position = UDim2.new(0, 82, 0.5, -10)
CheckBtn.BackgroundColor3 = C_TICK
CheckBtn.BorderSizePixel = 0
CheckBtn.Text = "✓"; CheckBtn.TextColor3 = C_WHITE
CheckBtn.TextSize = 11; CheckBtn.Font = Enum.Font.GothamBold
Instance.new("UICorner", CheckBtn).CornerRadius = UDim.new(0, 4)
CheckBtn.MouseButton1Click:Connect(function()
    scanning = not scanning
    CheckBtn.BackgroundColor3 = scanning and C_TICK or Color3.fromRGB(80,80,80)
    CheckBtn.Text = scanning and "✓" or "✗"
end)

-- Pause button
local PauseBtn = Instance.new("TextButton", MinRow)
PauseBtn.Size = UDim2.new(0, 26, 0, 20)
PauseBtn.Position = UDim2.new(0, 112, 0.5, -10)
PauseBtn.BackgroundColor3 = C_BLUE
PauseBtn.BorderSizePixel = 0
PauseBtn.Text = "⏸"; PauseBtn.TextColor3 = C_WHITE
PauseBtn.TextSize = 11; PauseBtn.Font = Enum.Font.GothamBold
Instance.new("UICorner", PauseBtn).CornerRadius = UDim.new(0, 4)
local paused = false
PauseBtn.MouseButton1Click:Connect(function()
    paused = not paused
    PauseBtn.Text = paused and "▶" or "⏸"
    PauseBtn.BackgroundColor3 = paused and C_YELLOW or C_BLUE
end)

-- BRAINROT INFO row
local InfoRow = Instance.new("Frame", Body)
InfoRow.Size = UDim2.new(1, -12, 0, 26)
InfoRow.Position = UDim2.new(0, 6, 0, 36)
InfoRow.BackgroundColor3 = C_BG2
InfoRow.BorderSizePixel = 0
Instance.new("UICorner", InfoRow).CornerRadius = UDim.new(0, 6)

-- Arrow icon
local ArrowLbl = Instance.new("TextLabel", InfoRow)
ArrowLbl.Size = UDim2.new(0, 16, 1, 0); ArrowLbl.Position = UDim2.new(0, 4, 0, 0)
ArrowLbl.BackgroundTransparency = 1; ArrowLbl.Text = ">"
ArrowLbl.TextColor3 = C_BLUE; ArrowLbl.TextSize = 10; ArrowLbl.Font = Enum.Font.GothamBold

local InfoLbl = Instance.new("TextLabel", InfoRow)
InfoLbl.Size = UDim2.new(1, -22, 1, 0); InfoLbl.Position = UDim2.new(0, 20, 0, 0)
InfoLbl.BackgroundTransparency = 1
InfoLbl.Text = "Escaneando..."
InfoLbl.TextColor3 = C_MUTED; InfoLbl.TextSize = 9; InfoLbl.Font = Enum.Font.Code
InfoLbl.TextXAlignment = Enum.TextXAlignment.Left
InfoLbl.TextTruncate = Enum.TextTruncate.AtEnd

-- BEST BRAINROT display (como el "Pakrahmatmamat $1.5M/s 13s" del ZL)
local BestFrame = Instance.new("Frame", Body)
BestFrame.Size = UDim2.new(1, -12, 0, 26)
BestFrame.Position = UDim2.new(0, 6, 0, 66)
BestFrame.BackgroundColor3 = Color3.fromRGB(15, 35, 20)
BestFrame.BorderSizePixel = 0
Instance.new("UICorner", BestFrame).CornerRadius = UDim.new(0, 6)
local bestStroke = Instance.new("UIStroke", BestFrame)
bestStroke.Color = C_GREEN; bestStroke.Thickness = 1; bestStroke.Transparency = 0.5

local BestNameLbl = Instance.new("TextLabel", BestFrame)
BestNameLbl.Size = UDim2.new(0.55, 0, 1, 0); BestNameLbl.Position = UDim2.new(0, 8, 0, 0)
BestNameLbl.BackgroundTransparency = 1; BestNameLbl.Text = "Esperando..."
BestNameLbl.TextColor3 = C_YELLOW; BestNameLbl.TextSize = 10; BestNameLbl.Font = Enum.Font.GothamBold
BestNameLbl.TextXAlignment = Enum.TextXAlignment.Left
BestNameLbl.TextTruncate = Enum.TextTruncate.AtEnd

local BestCashLbl = Instance.new("TextLabel", BestFrame)
BestCashLbl.Size = UDim2.new(0.45, -8, 1, 0); BestCashLbl.Position = UDim2.new(0.55, 0, 0, 0)
BestCashLbl.BackgroundTransparency = 1; BestCashLbl.Text = ""
BestCashLbl.TextColor3 = C_GREEN; BestCashLbl.TextSize = 10; BestCashLbl.Font = Enum.Font.GothamBold
BestCashLbl.TextXAlignment = Enum.TextXAlignment.Right

-- TP TO BEST logic
TpBtn.MouseButton1Click:Connect(function()
    if bestServer and bestServer ~= "" then
        TpBtn.Text = "Teleportando..."
        TpBtn.BackgroundColor3 = C_GREEN
        local ok1 = pcall(function()
            TeleportService:TeleportToPlaceInstance(PLACE_ID, bestServer, player)
        end)
        if not ok1 then
            pcall(function()
                local opts = Instance.new("TeleportOptions")
                opts.ServerInstanceId = bestServer
                TeleportService:TeleportAsync(PLACE_ID, {player}, opts)
            end)
        end
    else
        TpBtn.Text = "Sin servidor aún"
        task.delay(2, function() TpBtn.Text = "Tp to Best  (X)" end)
    end
end)

-- ══════════════════════════════════════════
--  SCAN LOOP
-- ══════════════════════════════════════════
task.spawn(function()
    while true do
        if scanning and not paused then
            local list = scanLocal()
            if #list > 0 then
                local main = list[1]
                local hash = normalizeName(main.name).."|"..tostring(math.floor(main.value)).."|"..game.JobId

                -- Actualizar display
                BestNameLbl.Text = main.name
                BestCashLbl.Text = formatMoney(main.value)
                InfoLbl.Text = main.name.." "..formatMoney(main.value)
                InfoLbl.TextColor3 = C_GREEN

                bestServer = game.JobId
                bestName   = main.name
                bestCash   = main.value

                if not notified[hash] then
                    notified[hash] = true
                    totalFound += 1
                    CountBadge.Text = tostring(totalFound)

                    -- Guardar en JSONbin
                    saveJsonbin(main.name, formatMoney(main.value):gsub("%$",""):gsub("/s",""), game.JobId)

                    -- Mandar a Discord
                    local embed = {
                        title = "💎 **"..main.name.."**",
                        color = 3066993,
                        description = "**— "..formatMoney(main.value).."**\n\n"
                            .."**Server ID**\n```"..game.JobId.."```\n"
                            .."**Join**\n[CLICK TO JOIN](https://www.roblox.com/games/start?placeId="..tostring(PLACE_ID).."&gameInstanceId="..game.JobId..")\n\n",
                        footer = { text = "H7K V3 VIP" }
                    }
                    sendToDiscord(HttpService:JSONEncode({ embeds = { embed } }))
                end
            else
                InfoLbl.Text = "Escaneando... (min "..tostring(minProd/1e6).."M)"
                InfoLbl.TextColor3 = C_MUTED
            end
        end
        task.wait(SCAN_DELAY)
    end
end)

