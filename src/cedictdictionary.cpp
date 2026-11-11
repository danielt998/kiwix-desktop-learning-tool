#include "cedictdictionary.h"

#include <QFile>
#include <QRegularExpression>

#include <algorithm>

namespace
{

const QRegularExpression cedictEntry(
    R"(^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$)");
const QRegularExpression chineseWord(
    R"(^[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}]+$)");

}

QStringList CedictDictionary::lookup(const QString& text, int cursorOffset,
                                     QString* matchedWord)
{
    if (!chineseWord.match(text).hasMatch())
        return {};

    if (!m_loaded)
        load();

    if (cursorOffset < 0 || cursorOffset >= text.size()) {
        if (matchedWord)
            *matchedWord = text;
        return m_entries.value(text);
    }

    const auto textLength = static_cast<int>(text.size());
    const auto maximumLength = std::min(m_longestWordLength, textLength);
    for (int length = maximumLength; length > 0; --length) {
        const auto firstStart = std::max(0, cursorOffset - length + 1);
        const auto lastStart = std::min(cursorOffset, textLength - length);
        for (int start = firstStart; start <= lastStart; ++start) {
            const auto word = text.mid(start, length);
            const auto entries = m_entries.value(word);
            if (!entries.isEmpty()) {
                if (matchedWord)
                    *matchedWord = word;
                return entries;
            }
        }
    }

    return {};
}

void CedictDictionary::load()
{
    m_loaded = true;

    QFile file(":/dictionaries/cc-cedict.txt");
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
        return;

    while (!file.atEnd()) {
        const auto line = QString::fromUtf8(file.readLine()).trimmed();
        if (line.isEmpty() || line.startsWith('#'))
            continue;

        const auto match = cedictEntry.match(line);
        if (!match.hasMatch())
            continue;

        const auto entry = QString("%1 [%2]\n%3")
            .arg(match.captured(1), match.captured(3), match.captured(4));
        m_entries[match.captured(1)].append(entry);
        m_longestWordLength = std::max(m_longestWordLength,
                                       static_cast<int>(match.captured(1).size()));
        if (match.captured(1) != match.captured(2))
            m_entries[match.captured(2)].append(entry);
        m_longestWordLength = std::max(m_longestWordLength,
                                       static_cast<int>(match.captured(2).size()));
    }
}
