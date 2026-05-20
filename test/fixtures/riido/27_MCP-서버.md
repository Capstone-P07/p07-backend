# MCP 서버

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FhtIOla6JKkgEYlsQBjFx%2F1.%20MCP%20%E1%84%8A%E1%85%A5%E1%86%B7%E1%84%82%E1%85%A6%E1%84%8B%E1%85%B5%E1%86%AF.png?alt=media&#x26;token=801d89af-9b07-4c73-a86c-148e416064f3" alt=""><figcaption></figcaption></figure>

## 개요

AI 툴(Claude, Cursor 등)은 이미 개발 및 기획 과정에서 필수 도구가 되었지만, 지금까지는 AI 작업 환경과 프로젝트 관리 툴이 단절되어 있었습니다. 이로 인해 AI가 분석한 결과를 뤼이도에 적용하거나 그 반대 역시 반복적인 수작업이 필요했습니다.

뤼이도 MCP(Model Context Protocol) 서버는 이 단절을 완전히 해소합니다. AI가 직접 뤼이도 워크스페이스에 연결되어 데이터 조회, 작업 생성, 문서 업데이트까지 처리할 수 있습니다.

## 설치 가이드

<details>

<summary><strong>Claude Desktop</strong></summary>

1. Claude 앱 설정 > 개발자 > 로컬 MCP 서버 영역에서 \[구성 편집] 버튼 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FW8R7bt17ljfdG1FnnPnY%2F2.%20%E1%84%8F%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A9%E1%84%83%E1%85%B3-01.png?alt=media&#x26;token=24c2cc42-adc6-494a-8137-e29c4cfccc06" alt=""><figcaption></figcaption></figure>

2. `claude_desktop_config.json` 파일 내에 다음 내용 붙여넣기

```json
{
  "mcpServers": {
    "Riido": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.api.riido.io/mcp"]
    }
  }
}
```

3. Claude 재시작 후, Riido MCP가 정상적으로 추가되었는지 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FJ9Z4gh0HMnavyR7ufXEL%2F3.%20%E1%84%8F%E1%85%B3%E1%86%AF%E1%84%85%E1%85%A9%E1%84%83%E1%85%B3-02.png?alt=media&#x26;token=f9e4b533-4bc4-4a11-b795-a92bf0f5dad0" alt=""><figcaption></figcaption></figure>

</details>

<details>

<summary><strong>ChatGPT</strong></summary>

{% hint style="info" %}
ChatGPT Pro 요금제 이상부터 사용 가능합니다.
{% endhint %}

1. 설정 > 연동 및 앱 커넥터 페이지 > 고급 설정으로 이동

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FMorSXp74gF1dPhKAseKR%2F01.%E1%84%80%E1%85%A9%E1%84%80%E1%85%B3%E1%86%B8%E1%84%89%E1%85%A5%E1%86%AF%E1%84%8C%E1%85%A5%E1%86%BC.png?alt=media&#x26;token=a85a2c65-c792-49ae-931a-f1d559e90abb" alt=""><figcaption></figcaption></figure>

2. 개발자 모드 활성화

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FYC3J4Dj2KBckobhf6DL6%2F02.%E1%84%80%E1%85%A2%E1%84%87%E1%85%A1%E1%86%AF%E1%84%8C%E1%85%A1%E1%84%86%E1%85%A9%E1%84%83%E1%85%B3.png?alt=media&#x26;token=4f302a51-c9b0-472d-a33c-c575c247c961" alt=""><figcaption></figcaption></figure>

3. 연동 및 앱 커넥터 페이지에서 \[앱 만들기] 선택

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FefTTDMZ9TDNIXYixYFpE%2F03.%E1%84%8B%E1%85%A2%E1%86%B8%E1%84%86%E1%85%A1%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%80%E1%85%B5.png?alt=media&#x26;token=176c6e0a-3d33-4f9b-a677-292f08e9ca54" alt=""><figcaption></figcaption></figure>

4. 앱 정보 입력 후 \[만들기] 클릭

```
· MCP 서버 URL: https://mcp.api.riido.io/mcp
· 인증: OAuth
```

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2F5rcZFvsJQAJlspSQxTqa%2F04.%E1%84%8B%E1%85%A2%E1%86%B8%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%87%E1%85%A9%E1%84%8B%E1%85%B5%E1%86%B8%E1%84%85%E1%85%A7%E1%86%A8.png?alt=media&#x26;token=0224f4dd-674b-4b67-902a-8fccf303bfab" alt=""><figcaption></figcaption></figure>

5. 연동 및 앱 커넥터 페이지에서 Riido MCP 연결 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FeL3SIT1Ry8xqKJzlAgje%2F05.%E1%84%8B%E1%85%A7%E1%86%AB%E1%84%80%E1%85%A7%E1%86%AF%E1%84%92%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%B5%E1%86%AB.png?alt=media&#x26;token=82caec31-8fbd-4274-832f-72971bba37c7" alt=""><figcaption></figcaption></figure>

6. \[+] 버튼을 클릭하여 Riido MCP 사용

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FdbFYtzjtarG0jbY9ayPO%2F06.Riido%20MCP%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%90%E1%85%A2%E1%86%A8.png?alt=media&#x26;token=b22dda83-3afc-4c4d-b9dc-b22e0bb0b25a" alt=""><figcaption></figcaption></figure>

</details>

<details>

<summary><strong>Cursor</strong></summary>

1. `CMD 또는 Ctrl` + `Shift` + `p` > MCP Settings 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2F6K3lopDvVFcBCzdFuVAs%2F01.%20MCP%20%E1%84%80%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A2%E1%86%A8.png?alt=media&#x26;token=34e646aa-cbef-419a-aa6f-e076a24a8617" alt=""><figcaption></figcaption></figure>

2. Installed MCP Servers 섹션에서 \[Add Custom MCP] 버튼 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FljphaULu9xj3DKjtCgZW%2F02.%20MCP%20%E1%84%8E%E1%85%AE%E1%84%80%E1%85%A1.png?alt=media&#x26;token=fcbd2260-5b4d-4590-8a19-9850c9734506" alt=""><figcaption></figcaption></figure>

3. 다음 내용 붙여넣기

```json
{
  "mcpServers": {
    "Riido": {
      "url": "https://mcp.api.riido.io/mcp"
    }
  }
}
```

4. Riido MCP 인증 진행

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2F8q1IfAhmz8Nu2Sx1IZaQ%2F03.%20MCP%20%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%8C%E1%85%B3%E1%86%BC.png?alt=media&#x26;token=a5c84fa6-f2a8-4ba6-840b-623a61763c8f" alt=""><figcaption></figcaption></figure>

5. Riido가 정상적으로 추가되었는지 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2Fjdsc4qzUwDwSTikzovi3%2F04.%20MCP%20%E1%84%92%E1%85%AA%E1%86%AF%E1%84%89%E1%85%A5%E1%86%BC.png?alt=media&#x26;token=7050af92-fd8f-49ab-9170-bd67300366ee" alt=""><figcaption></figcaption></figure>

</details>

<details>

<summary><strong>Visual Studio Code</strong></summary>

1. `CMD 또는 Ctrl` + `Shift` + `p` > MCP: Add Server… 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FREDdK58Y2mbDDSCbXL73%2F01.%20MCP%20%E1%84%80%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A2%E1%86%A8.png?alt=media&#x26;token=43f0be1f-e55c-4c1a-ba0e-7ad5f668fbd5" alt=""><figcaption></figcaption></figure>

2. Command (stdio) 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2Fz462h22B0YSqWgxJvDei%2F02.%20command%20%E1%84%89%E1%85%A5%E1%86%AB%E1%84%90%E1%85%A2%E1%86%A8.png?alt=media&#x26;token=b28624e9-4723-460b-a5ca-a9731e3eacf8" alt=""><figcaption></figcaption></figure>

3. 다음 내용 붙여넣기 후 `Enter`

```bash
npx mcp-remote https://mcp.api.riido.io/mcp
```

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FudixImkhDVrBZb2P2uTY%2F03.%20%E1%84%83%E1%85%A1%E1%84%8B%E1%85%B3%E1%86%B7%20%E1%84%82%E1%85%A2%E1%84%8B%E1%85%AD%E1%86%BC%20%E1%84%87%E1%85%AE%E1%87%80%E1%84%8B%E1%85%A7%E1%84%82%E1%85%A5%E1%87%82%E1%84%80%E1%85%B5.png?alt=media&#x26;token=dff15c8e-ba70-4e53-8b9f-31d6b54c9b7e" alt=""><figcaption></figcaption></figure>

4. 서버 ID 입력 창에 `Riido` 입력 후 `Enter`

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FZw53NDlm4dtHMEYYXCDr%2F04.%20%E1%84%89%E1%85%A5%E1%84%87%E1%85%A5%20ID%20%E1%84%8B%E1%85%B5%E1%86%B8%E1%84%85%E1%85%A7%E1%86%A8.png?alt=media&#x26;token=7616a840-512b-4293-afe6-0086cbf34204" alt=""><figcaption></figcaption></figure>

5. 서버 등록 완료 후, `CMD 또는 Ctrl` + `Shift` + `p` > MCP: List Servers 클릭

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FQyEzoN4lXL3pbAg774s7%2F05.%20MCP%20List%20%E1%84%92%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%B5%E1%86%AB.png?alt=media&#x26;token=62413078-6e05-4b97-bc1a-acbbba75a576" alt=""><figcaption></figcaption></figure>

6. Riido MCP Server가 Running(동작 중) 상태로 표시되는 것을 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FAYbcRR0HMvLtbMIcym9v%2F06.%20Riido%20%E1%84%83%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A1%E1%86%A8%20%E1%84%8C%E1%85%AE%E1%86%BC%20%E1%84%92%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%B5%E1%86%AB.png?alt=media&#x26;token=d46f7024-1a2a-4418-a132-9401337e626d" alt=""><figcaption></figcaption></figure>

</details>

<details>

<summary><strong>Claude Code</strong></summary>

1. [Claude Code](https://claude.com/product/claude-code) 설치
2. 터미널에서 Riido MCP 추가

```bash
$ claude mcp add --transport http riido https://mcp.api.riido.io/mcp
```

3. Claude Code 실행 후 MCP 목록 확인

```bash
$ claude
$ /mcp
```

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2Fj7dHUZUbFsTelRjnBu83%2F01.mcp%20%E1%84%86%E1%85%A9%E1%86%A8%E1%84%85%E1%85%A9%E1%86%A8%20%E1%84%92%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%B5%E1%86%AB.png?alt=media&#x26;token=a30a70b9-dcfb-4be9-a6d5-8d3734c1899b" alt=""><figcaption></figcaption></figure>

4. \[Authenticate] 선택

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FaFa9wSwgQUkuZd54KX3m%2F02.riido%20%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%8C%E1%85%B3%E1%86%BC%20%E1%84%8C%E1%85%B5%E1%86%AB%E1%84%92%E1%85%A2%E1%86%BC%201.png?alt=media&#x26;token=b783250d-d7ef-4261-b1f2-061e080fdae4" alt=""><figcaption></figcaption></figure>

5. 브라우저를 통해 Riido MCP 권한 부여

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2Fo83KwrfwkurTAvZFgoEk%2F03.riido%20%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%8C%E1%85%B3%E1%86%BC%20%E1%84%8C%E1%85%B5%E1%86%AB%E1%84%92%E1%85%A2%E1%86%BC%202.png?alt=media&#x26;token=1fa53e7c-edf8-4bfe-89c7-df2129256a8f" alt=""><figcaption></figcaption></figure>

6. MCP 목록에서 Riido MCP 정상 연결 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FkNgDcS4A8V0gUEMEtnWb%2F04.mcp%20%E1%84%8B%E1%85%A7%E1%86%AB%E1%84%83%E1%85%A9%E1%86%BC%20%E1%84%8B%E1%85%AA%E1%86%AB%E1%84%85%E1%85%AD.png?alt=media&#x26;token=b64311f6-0ad7-4079-9d34-9f1c5df3ca8b" alt=""><figcaption></figcaption></figure>

</details>

<details>

<summary><strong>Gemini CLI</strong></summary>

1. [Gemini CLI](https://geminicli.com/) 설치
2. `~/.gemini/settings.json` 파일 내에 다음 내용 붙여넣기

```json
{
  "mcpServers": {
    "Riido": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.api.riido.io/mcp"]
    }
  }
}
```

3. Gemini 실행 후, 브라우저를 통해 Riido MCP 권한 부여

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FGGPBpmFx5py6ZNCQsRvO%2F01.Riido%20MCP%20%E1%84%80%E1%85%AF%E1%86%AB%E1%84%92%E1%85%A1%E1%86%AB%20%E1%84%87%E1%85%AE%E1%84%8B%E1%85%A7.png?alt=media&#x26;token=2280b8b5-fa00-4fd8-83d1-7bb3d0434745" alt=""><figcaption></figcaption></figure>

4. MCP 목록 확인

```bash
$ /mcp
```

5. Riido MCP 정상 연결 확인

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FSRaxUir5HNo1cTpG14N5%2F02.MCP%20%E1%84%8B%E1%85%A7%E1%86%AB%E1%84%80%E1%85%A7%E1%86%AF%20%E1%84%92%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%B5%E1%86%AB.png?alt=media&#x26;token=1c4766ee-9d11-4e62-86f9-c01cad2532e4" alt=""><figcaption></figcaption></figure>

</details>

## MCP 사용 사례

#### 1️⃣ 워크스페이스 · 팀 · 작업 데이터, 실시간 조회

AI가 내 뤼이도 계정에 연결되어, 워크스페이스와 팀 구성은 물론 모든 작업 목록까지 실시간으로 불러올 수 있습니다. 더 이상 복사+붙여넣기로 데이터를 옮길 필요가 없습니다. 이제 AI가 직접 데이터를 조회하고 분석해, 더 깊은 인사이트를 제공합니다.

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FntlbRmlGVEhyzaHqafnM%2F2.%20%E1%84%8B%E1%85%AF%E1%84%8F%E1%85%B3%E1%84%89%E1%85%B3%E1%84%91%E1%85%A6%E1%84%8B%E1%85%B5%E1%84%89%E1%85%B3%20%C2%B7%20%E1%84%90%E1%85%B5%E1%86%B7%20%C2%B7%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%20%E1%84%83%E1%85%A6%E1%84%8B%E1%85%B5%E1%84%90%E1%85%A5%2C%20%E1%84%89%E1%85%B5%E1%86%AF%E1%84%89%E1%85%B5%E1%84%80%E1%85%A1%E1%86%AB%20%E1%84%8C%E1%85%A9%E1%84%92%E1%85%AC.png?alt=media&#x26;token=a156c420-1f7c-4ef9-a9c6-1669ead4529f" alt=""><figcaption></figcaption></figure>

#### 2️⃣ **프로젝트 현황, AI로 한눈에**

AI가 팀의 프로젝트 현황을 실시간으로 분석해, 진행률과 핵심 지표를 한눈에 보여줘요.

“이번 프로젝트의 진행 상황은 어때?” 한마디면 충분합니다. 요약 보고서는 물론, 병목 지점과 잠재 리스크까지 AI가 자동으로 짚어드립니다.

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FBhqzgYuVYBXVKjrf61OK%2F3.%20%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%8C%E1%85%A6%E1%86%A8%E1%84%90%E1%85%B3%20%E1%84%92%E1%85%A7%E1%86%AB%E1%84%92%E1%85%AA%E1%86%BC%2C%20AI%E1%84%85%E1%85%A9%20%E1%84%92%E1%85%A1%E1%86%AB%E1%84%82%E1%85%AE%E1%86%AB%E1%84%8B%E1%85%A6.png?alt=media&#x26;token=961575b6-4bc1-43f1-b7da-bbe04fe176f7" alt=""><figcaption></figcaption></figure>

#### 3️⃣ **기획에서 코드로**

이제 개발자는 뤼이도에 있는 기획서를 곧바로 바이브 코딩에 활용할 수 있습니다. “REST API 개발 요구사항대로 코드를 구현해 줘”라고 말하면, Cursor가 뤼이도 작업 기획안을 분석해 즉시 코드로 구현합니다. 문서를 찾아 헤매거나 툴을 전환할 필요 없이, 오직 개발에만 집중할 수 있습니다.

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2Fnz7U1vB3VPqjivhaomp2%2F4.%20%E1%84%80%E1%85%B5%E1%84%92%E1%85%AC%E1%86%A8%E1%84%8B%E1%85%A6%E1%84%89%E1%85%A5%20%E1%84%8F%E1%85%A9%E1%84%83%E1%85%B3%E1%84%85%E1%85%A9.png?alt=media&#x26;token=089e9bbc-ce95-46dc-8cd0-db54eae4eebc" alt=""><figcaption></figcaption></figure>

#### 4️⃣ **아이디어만 말하면 작업이 생성됩니다.**

AI는 프로젝트 맥락을 이해하여 설명만으로도 온전한 작업을 만들어냅니다. 아이디어가 떠올랐다면 한 문장으로 표현해 주세요. 제목, 상세 설명, 라벨, 마감 기한까지 모든 필드를 자동으로 채워, 사용자의 부담을 덜어드립니다.

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2FT6uBw93PCU94G5DzHj5e%2F5.%20%E1%84%8B%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%83%E1%85%B5%E1%84%8B%E1%85%A5%E1%84%86%E1%85%A1%E1%86%AB%20%E1%84%86%E1%85%A1%E1%86%AF%E1%84%92%E1%85%A1%E1%84%86%E1%85%A7%E1%86%AB%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%8B%E1%85%B5%20%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC%E1%84%83%E1%85%AC%E1%86%B8%E1%84%82%E1%85%B5%E1%84%83%E1%85%A1..png?alt=media&#x26;token=a09ca60d-fcab-45c4-8ae3-26b34db707d5" alt=""><figcaption></figcaption></figure>

#### 5️⃣ **문서 작성까지, AI가 대신합니다.**

개발자는 더 이상 작업 결과물을 정리하느라 시간을 쓸 필요 없습니다. Cursor에서 새로운 기능을 완성했을 때, “방금 구현한 로그인 기능을 뤼이도 작업에 요약해서 팀과 공유해 줘”라고 말해보세요. AI가 코드를 분석해, 팀원들이 이해하기 쉬운 형태로 뤼이도 작업 페이지에 자동으로 정리해 줘요.

<figure><img src="https://2256927146-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FyqZD3AkEAPY8PpFx96YK%2Fuploads%2F6ltYfcsWFDtgzCXOOmNU%2F6.%20%E1%84%86%E1%85%AE%E1%86%AB%E1%84%89%E1%85%A5%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%89%E1%85%A5%E1%86%BC%E1%84%81%E1%85%A1%E1%84%8C%E1%85%B5%2C%20AI%E1%84%80%E1%85%A1%20%E1%84%83%E1%85%A2%E1%84%89%E1%85%B5%E1%86%AB%E1%84%92%E1%85%A1%E1%86%B8%E1%84%82%E1%85%B5%E1%84%83%E1%85%A1..png?alt=media&#x26;token=131372d5-01b5-41bc-acb5-10c5a655ced0" alt=""><figcaption></figcaption></figure>
