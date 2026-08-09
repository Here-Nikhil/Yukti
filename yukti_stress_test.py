# yukti_stress_test.py
# Stress test for Yukti's parser + apply pipeline.
# Simulates realistic, messy LLM outputs across multiple languages and instruction styles.
# Drop this file OUTSIDE the backend folder. Has no imports from yukti internals.
# Run locally: python yukti_stress_test.py

import sys
import os

# ── Point to your backend so we can import core modules ──────────────────────
BACKEND_PATH = os.path.join(os.path.dirname(__file__), "yukti-backend")
sys.path.insert(0, BACKEND_PATH)

from core.parser import LLMOutputParser
from core.diff import DiffGenerator
from core.fuzzy import FuzzyMatcher
from models.schemas import ParsedInstruction, ActionEnum, ConfidenceEnum

p = LLMOutputParser()
diff = DiffGenerator()
fuzzy = FuzzyMatcher()

passed = 0
failed = 0

def test(name, condition):
    global passed, failed
    if condition:
        print(f"  ✅ {name}")
        passed += 1
    else:
        print(f"  ❌ {name}")
        failed += 1

def section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")


# ════════════════════════════════════════════════════════════════
# SECTION 1 — Python: FastAPI style (Claude two-block output)
# ════════════════════════════════════════════════════════════════
section("1 · Python / FastAPI — Claude-style two-block replace")

llm_output_1 = '''
In `server.py`, find this:

```python
    allow_origins=["*"],
```

And replace it with:

```python
    allow_origins=["https://myapp.vercel.app"],
```
'''

files_1 = ["server.py"]
r1 = p.parse(llm_output_1, files_1)
test("Parses exactly 1 instruction", len(r1) == 1)
test("Correct file resolved", r1[0].file == "server.py")
test("Target contains wildcard", r1[0].target and '["*"]' in r1[0].target)
test("Replacement contains domain", r1[0].replacement and "myapp.vercel.app" in r1[0].replacement)
test("Confidence is high", r1[0].confidence.value == "high")


# ════════════════════════════════════════════════════════════════
# SECTION 2 — JavaScript: React component (ChatGPT single-block)
# ════════════════════════════════════════════════════════════════
section("2 · JavaScript / React — ChatGPT-style single-block replace")

llm_output_2 = '''
Replace the handleSubmit function in `src/components/LoginForm.jsx` with this fixed version:

```js
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!email || !password) {
    setError("Both fields are required.");
    return;
  }
  await login(email, password);
};
```
'''

files_2 = ["src/components/LoginForm.jsx"]
r2 = p.parse(llm_output_2, files_2)
test("Parses exactly 1 instruction", len(r2) == 1)
test("Correct file resolved", r2[0].file == "src/components/LoginForm.jsx")
test("Target is None (whole-function replace)", r2[0].target is None)
test("Replacement has preventDefault", r2[0].replacement and "preventDefault" in r2[0].replacement)


# ════════════════════════════════════════════════════════════════
# SECTION 3 — Python: Apply with exact target, indentation check
# ════════════════════════════════════════════════════════════════
section("3 · Python — Apply exact target, indentation must be preserved")

file_content_3 = """\
class UserService:
    def __init__(self, db):
        self.db = db

    def get_user(self, user_id):
        result = self.db.query("SELECT * FROM users")
        return result
"""

inst3 = ParsedInstruction(
    file="services/user_service.py",
    action=ActionEnum.REPLACE,
    target='        result = self.db.query("SELECT * FROM users")',
    replacement='        result = self.db.query("SELECT * FROM users WHERE id = %s", [user_id])',
    line_hint=None,
    confidence=ConfidenceEnum.HIGH,
    raw=""
)
result3 = diff.apply_instruction(file_content_3, inst3, fuzzy)
test("Correct query applied", "WHERE id = %s" in result3)
test("Old query removed", "SELECT * FROM users\")" not in result3)
test("Class definition untouched", "class UserService:" in result3)
test("Indentation preserved (8 spaces)", "        result = self.db.query" in result3)


# ════════════════════════════════════════════════════════════════
# SECTION 4 — TypeScript: Fuzzy match (slightly wrong whitespace)
# ════════════════════════════════════════════════════════════════
section("4 · TypeScript — Fuzzy match with extra whitespace in target")

file_content_4 = """\
export const fetchUser = async (id: string): Promise<User> => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data;
};
"""

# LLM gave slightly different spacing in target — fuzzy should still catch it
inst4 = ParsedInstruction(
    file="lib/api.ts",
    action=ActionEnum.REPLACE,
    target='  if (!res.ok)  throw new Error("Failed")',   # extra space — fuzzy needed
    replacement='  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)',
    line_hint=None,
    confidence=ConfidenceEnum.HIGH,
    raw=""
)
result4 = diff.apply_instruction(file_content_4, inst4, fuzzy)
test("Fuzzy matched despite extra space", "Fetch failed" in result4)
test("Original error line removed", '"Failed"' not in result4)
test("Rest of function intact", "fetchUser" in result4 and "res.json()" in result4)


# ════════════════════════════════════════════════════════════════
# SECTION 5 — CSS: Non-code file, single property change
# ════════════════════════════════════════════════════════════════
section("5 · CSS — Single property replace")

file_content_5 = """\
.container {
  display: flex;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 4px;
}
"""

inst5 = ParsedInstruction(
    file="styles/main.css",
    action=ActionEnum.REPLACE,
    target="  background-color: #ffffff;",
    replacement="  background-color: #0d0b14;",
    line_hint=None,
    confidence=ConfidenceEnum.HIGH,
    raw=""
)
result5 = diff.apply_instruction(file_content_5, inst5, fuzzy)
test("Dark background applied", "#0d0b14" in result5)
test("White background removed", "#ffffff" not in result5)
test("Other properties untouched", "border-radius: 4px;" in result5)


# ════════════════════════════════════════════════════════════════
# SECTION 6 — Python: target=None (whole file replacement)
# ════════════════════════════════════════════════════════════════
section("6 · Python — target=None, whole file replacement")

file_content_6 = """\
def greet(name):
    return "hello " + name
"""

inst6 = ParsedInstruction(
    file="utils/greet.py",
    action=ActionEnum.REPLACE,
    target=None,
    replacement='def greet(name: str) -> str:\n    return f"Hello, {name}!"\n',
    line_hint=None,
    confidence=ConfidenceEnum.MEDIUM,
    raw=""
)
result6 = diff.apply_instruction(file_content_6, inst6, fuzzy)
test("New function applied", 'f"Hello, {name}!"' in result6)
test("Old concatenation removed", '"hello " +' not in result6)


# ════════════════════════════════════════════════════════════════
# SECTION 7 — SQL: Schema file, fuzzy match column rename
# ════════════════════════════════════════════════════════════════
section("7 · SQL — Fuzzy match column rename in schema file")

file_content_7 = """\
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  total_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
"""

inst7 = ParsedInstruction(
    file="schema.sql",
    action=ActionEnum.REPLACE,
    target="  total_amount NUMERIC(10,2)",   # LLM dropped the comma — fuzzy needed
    replacement="  total_price NUMERIC(10,2),",
    line_hint=None,
    confidence=ConfidenceEnum.HIGH,
    raw=""
)
result7 = diff.apply_instruction(file_content_7, inst7, fuzzy)
test("Column renamed to total_price", "total_price" in result7)
test("Old column name removed", "total_amount" not in result7)
test("Rest of schema intact", "user_id TEXT NOT NULL" in result7)


# ════════════════════════════════════════════════════════════════
# SECTION 8 — Ambiguous LLM output (Tier 3 — should flag, not crash)
# ════════════════════════════════════════════════════════════════
section("8 · Ambiguous output — should parse without crashing")

llm_output_8 = '''
You should update the timeout value. It's currently too low.
Just change it to something like 5000 milliseconds.
This is in your config file somewhere.
'''

files_8 = ["config.js", "settings.py"]
r8 = p.parse(llm_output_8, files_8)
# We don't assert a specific result — just that it doesn't throw and returns a list
test("Returns a list (no crash)", isinstance(r8, list))
test("Zero or more instructions (ambiguous is ok)", len(r8) >= 0)


# ════════════════════════════════════════════════════════════════
# SECTION 9 — Multi-instruction in one LLM output
# ════════════════════════════════════════════════════════════════
section("9 · Multi-instruction — two separate changes in one LLM response")

llm_output_9 = '''
In `app/config.py`, replace:

```python
DEBUG = True
```

with:

```python
DEBUG = False
```

Also in `app/config.py`, replace:

```python
SECRET_KEY = "dev-key-123"
```

with:

```python
SECRET_KEY = os.environ.get("SECRET_KEY")
```
'''

files_9 = ["app/config.py"]
r9 = p.parse(llm_output_9, files_9)
test("Parses 2 instructions", len(r9) == 2)
test("First: DEBUG target correct", any("DEBUG = True" in (i.target or "") for i in r9))
test("Second: SECRET_KEY target correct", any("SECRET_KEY" in (i.target or "") for i in r9))
test("Both point to same file", all(i.file == "app/config.py" for i in r9))


# ════════════════════════════════════════════════════════════════
# SECTION 10 — Go: Unfamiliar language, exact match
# ════════════════════════════════════════════════════════════════
section("10 · Go — Less common language, exact line replace")

file_content_10 = """\
package main

import "fmt"

func main() {
\tname := "world"
\tfmt.Println("Hello, " + name)
}
"""

inst10 = ParsedInstruction(
    file="main.go",
    action=ActionEnum.REPLACE,
    target='\tfmt.Println("Hello, " + name)',
    replacement='\tfmt.Printf("Hello, %s!\\n", name)',
    line_hint=None,
    confidence=ConfidenceEnum.HIGH,
    raw=""
)
result10 = diff.apply_instruction(file_content_10, inst10, fuzzy)
test("Printf applied", "Printf" in result10)
test("Println removed", "Println" not in result10)
test("Package declaration intact", "package main" in result10)


# ════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════
print(f"\n{'═'*60}")
print(f"  Results: {passed} passed, {failed} failed out of {passed+failed} tests")
print(f"{'═'*60}\n")

if failed > 0:
    sys.exit(1)