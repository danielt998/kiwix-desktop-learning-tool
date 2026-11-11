#ifndef CEDICTDICTIONARY_H
#define CEDICTDICTIONARY_H

#include <QHash>
#include <QStringList>

class CedictDictionary
{
public:
    QStringList lookup(const QString& text, int cursorOffset = -1,
                       QString* matchedWord = nullptr);

private:
    void load();

    bool m_loaded = false;
    int m_longestWordLength = 0;
    QHash<QString, QStringList> m_entries;
};

#endif // CEDICTDICTIONARY_H
