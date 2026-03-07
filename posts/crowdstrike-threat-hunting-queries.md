# Threat Hunting with CrowdStrike: Query Patterns That Actually Find Threats

CrowdStrike Falcon's Event Search is one of the most powerful threat hunting tools available in enterprise security — but only if you know the right queries to run. After spending two years hunting threats at Providence India, I've compiled the query patterns that consistently surface real threats versus noise.

---

## Why Threat Hunting Matters

Alert-driven SOC work is reactive by nature. Threat hunting flips the model: you start with a hypothesis and look for evidence of compromise that hasn't triggered an alert yet. CrowdStrike's telemetry is incredibly rich, but drowning in it is easy.

The goal is **high-fidelity queries that surface signal, not noise**.

---

## 1. Lateral Movement: Detecting PSEXEC and WMI Abuse

Attackers frequently use PsExec and WMI for lateral movement. Look for these process creation patterns:

```sql
event_type=ProcessRollup2
| where FileName IN ("psexec.exe", "psexec64.exe", "wmiprvse.exe")
| where ParentBaseFileName NOT IN ("services.exe", "svchost.exe")
| stats count by ComputerName, UserName, FileName, CommandLine
| sort -count
```

**What to look for:** PsExec spawned by anything other than legitimate admin tools, or WMI processes with unusual parent-child chains.

---

## 2. C2 Beaconing: Detecting Regular Outbound Connections

Beaconing malware makes regular outbound connections at fixed intervals. This query identifies hosts making repetitive connections to the same external IP:

```sql
event_type=NetworkConnectIP4
| where RemoteAddressIP4 !startswith "10."
| where RemoteAddressIP4 !startswith "192.168."
| where RemoteAddressIP4 !startswith "172."
| stats count, dc(LocalPort) as unique_ports by ComputerName, RemoteAddressIP4
| where count > 20 AND unique_ports < 3
| sort -count
```

**Interpretation:** High connection count to a single IP with few unique local ports = beaconing signature.

---

## 3. Privilege Escalation: Token Manipulation

```sql
event_type=ProcessRollup2
| where CommandLine MATCHES ".*ImpersonateLoggedOnUser.*|.*DuplicateToken.*|.*CreateProcessWithToken.*"
| stats count by ComputerName, UserName, CommandLine
```

Also watch for `whoami /priv` and `whoami /all` executions in sensitive contexts — attackers love to check their privilege level.

---

## 4. Credential Dumping: LSASS Access Patterns

LSASS memory reads are a classic credential dumping indicator:

```sql
event_type=SyntheticProcessRollup2
| where TargetImageFileName MATCHES ".*lsass.*"
| where GrantedAccess IN ("0x1010", "0x1410", "0x1fffff")
| stats count by ComputerName, ImageFileName, TargetImageFileName, GrantedAccess
```

Legitimate processes that access LSASS are few — anything unexpected here deserves immediate investigation.

---

## 5. Persistence: Scheduled Task Creation

Attackers create scheduled tasks to survive reboots. Hunt for unusual task registrations:

```sql
event_type=ProcessRollup2
| where FileName = "schtasks.exe"
| where CommandLine MATCHES ".*/create.*"
| where CommandLine NOT MATCHES ".*\\Microsoft\\.*"
| stats count by ComputerName, UserName, CommandLine
| sort -count
```

---

## Operationalizing These Queries

- Schedule weekly hunts for each query during low-alert periods
- Build dashboards in Falcon for the highest-value patterns
- Correlate hits with threat intel feeds (MITRE ATT&CK mappings)
- Document every confirmed true positive — they become future detection rules

---

## Final Thought

The best threat hunters don't just run queries — they understand *why* attackers do what they do. Map every hunt to a MITRE technique, and you'll build intuition that makes your queries sharper over time.

Questions or feedback? Reach me at pranay.mokida@protonmail.com
