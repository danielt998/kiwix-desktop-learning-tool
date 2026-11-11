#ifndef CEDICTDICTIONARY_H
#define CEDICTDICTIONARY_H

#include <QHash>
#include <QStringList>

class CedictDictionary
{
public:
    QStringList lookup(const QString& word);

private:
    void load();

    bool m_loaded = false;
    QHash<QString, QStringList> m_entries;
};

#endif // CEDICTDICTIONARY_H
