#ifndef KIWIXWEBCHANNELOBJECT_H
#define KIWIXWEBCHANNELOBJECT_H

#include <QObject>

#include "jiebasegmenter.h"

class KiwixWebChannelObject : public QObject
{
    Q_OBJECT

public:
    explicit KiwixWebChannelObject(QObject *parent = nullptr) : QObject(parent) {};

    Q_INVOKABLE void sendHeadersJSONStr(const QString& headersJSONStr) { emit headersChanged(headersJSONStr); };
    Q_INVOKABLE void requestDictionaryLookup(const QString& text, int x, int y, int cursorOffset) {
        emit dictionaryLookupRequested(text, x, y, cursorOffset);
    };
    Q_INVOKABLE QString segmentChineseText(const QString& text) { return m_segmenter.segment(text); };

signals:
    void headersChanged(const QString& headersJSONStr);
    void navigationRequested(const QString& url, const QString& anchor);
    void dictionaryLookupRequested(const QString& text, int x, int y, int cursorOffset);

private:
    JiebaSegmenter m_segmenter;
};

#endif // KIWIXWEBCHANNELOBJECT_H
