#ifndef KIWIXWEBCHANNELOBJECT_H
#define KIWIXWEBCHANNELOBJECT_H

#include <QObject>

class KiwixWebChannelObject : public QObject
{
    Q_OBJECT

public:
    explicit KiwixWebChannelObject(QObject *parent = nullptr) : QObject(parent) {};

    Q_INVOKABLE void sendHeadersJSONStr(const QString& headersJSONStr) { emit headersChanged(headersJSONStr); };
    Q_INVOKABLE void selectedTextChanged(const QString& text, int x, int y) { emit selectionChanged(text, x, y); };

signals:
    void headersChanged(const QString& headersJSONStr);
    void navigationRequested(const QString& url, const QString& anchor);
    void selectionChanged(const QString& text, int x, int y);
};

#endif // KIWIXWEBCHANNELOBJECT_H
