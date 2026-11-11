#include "cedictdictionary.h"

#include <QFile>
#include <QRegularExpression>

namespace
{

const QRegularExpression cedictEntry(
    R"(^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$)");
const QRegularExpression chineseWord(
    R"(^[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}]+$)");

}

QStringList CedictDictionary::lookup(const QString& word)
{
    if (!chineseWord.match(word).hasMatch())
        return {};

    if (!m_loaded)
        load();

    return m_entries.value(word);
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
        if (match.captured(1) != match.captured(2))
            m_entries[match.captured(2)].append(entry);
    }
}
