---
title: מחרוזות ותווים
kind: chapter
---

# מחרוזות ותווים

## מחרוזת

**מחרוזת** (`string`) - רצף של **תווים**. ניגשים לתווים **כמו למערך**: `s[0]` הוא התו הראשון, `s.Length` הוא האורך.

**אבל**: מחרוזת היא **בלתי ניתנת לשינוי** (immutable) - **אי אפשר** לכתוב `s[0] = 'A'`. כל "שינוי" **בונה מחרוזת חדשה**, וצריך להציב אותה בחזרה:

```csharp
s = s.ToUpper();                                  // s.ToUpper() alone does nothing to s
s = s.Substring(0, 3) + "X" + s.Substring(4);     // "replace" the character at index 3
```

**שרשור** - באמצעות `+`: `"a" + "b"` הוא `"ab"`.

## פעולות שימושיות

```csharp
int len = s.Length;              // length
char c = s[i];                   // i-th character (read only)
string t = s.Substring(i);       // from index i to the end
string u = s.Substring(i, k);    // k characters starting at index i
int p = s.IndexOf('x');          // first position of 'x', or -1 if missing
int q = s.IndexOf("ab", i);      // first position of "ab" starting from index i
int r = s.LastIndexOf('x');      // last position
bool b = s.Equals(t);            // same content? (also: s == t)
int cmp = s.CompareTo(t);        // < 0, 0, > 0 - alphabetical order
string v = s.Replace("a", "b");  // replace all occurrences
string w = s.Trim();             // remove spaces at both ends
string x = s.ToUpper();          // also ToLower()
string y = s.Insert(i, "abc");   // insert at index i
string z = s.Remove(i, k);       // remove k characters from index i
char[] arr = s.ToCharArray();    // to an array of characters
```

**שימו לב**: `Substring(i, k)` - הפרמטר השני הוא **אורך**, לא אינדקס סיום!

## תווים

**תו** (`char`) - בגרש בודד: `'a'`. כל תו הוא בעצם **מספר** (קוד). לכן אפשר לחשב:

```csharp
int digit = c - '0';             // '7' -> 7
int index = c - 'a';             // 'a' -> 0, 'b' -> 1 ...
char next = (char)(c + 1);       // 'a' -> 'b'
```

| פעולה | מחזירה `true` אם התו... |
|---|---|
| ‏`Char.IsLetter(c)` | אות |
| ‏`Char.IsDigit(c)` | ספרה |
| ‏`Char.IsLetterOrDigit(c)` | אות או ספרה |
| ‏`Char.IsWhiteSpace(c)` | רווח |
| ‏`Char.IsUpper(c)` / `Char.IsLower(c)` | אות גדולה / קטנה |

ו-`Char.ToUpper(c)` / `Char.ToLower(c)` - מחזירות את התו המומר.

## תווים מיוחדים

בתוך מחרוזת, `\` מתחיל **תו מיוחד**:

| כתיבה | משמעות |
|---|---|
| ‏`\n` | שורה חדשה |
| ‏`\t` | טאב |
| ‏`\"` | מירכאות |
| ‏`\'` | גרש |
| ‏`\\` | לוכסן הפוך |

**`@` לפני מחרוזת** - מבטל את התווים המיוחדים: `@"C:\users\docs"`.

## דוגמה: האם מחרוזת היא פלינדרום

```csharp
public static bool IsPalindrome(string s)
{
    for (int i = 0; i < s.Length / 2; i++)       // only up to the middle
        if (s[i] != s[s.Length - 1 - i])
            return false;
    return true;
}
```

## שאלות לחזרה

- למה `s.ToUpper();` לבד לא משנה את `s`?
- מה מחזיר `"computer".Substring(3, 2)`?
- איך הופכים תו ספרה (`'5'`) למספר?
- כתוב פעולה שסופרת כמה תנועות (`a, e, i, o, u`) יש במחרוזת.
