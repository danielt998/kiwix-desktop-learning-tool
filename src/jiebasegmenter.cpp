#include "jiebasegmenter.h"

#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QStandardPaths>
#include <QDebug>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#include <cppjieba/Jieba.hpp>
#pragma GCC diagnostic pop

namespace
{

const QStringList dictionaryFiles = {
    "jieba.dict.utf8",
    "hmm_model.utf8",
    "user.dict.utf8",
    "idf.utf8",
    "stop_words.utf8"
};

}

JiebaSegmenter::JiebaSegmenter() = default;
JiebaSegmenter::~JiebaSegmenter() = default;

QString JiebaSegmenter::segment(const QString& text)
{
    if (text.isEmpty() || (!m_jieba && !initialize()))
        return "[]";

    std::vector<std::string> words;
    m_jieba->Cut(text.toStdString(), words);

    QJsonArray result;
    for (const auto& word : words)
        result.append(QString::fromStdString(word));
    return QString::fromUtf8(QJsonDocument(result).toJson(QJsonDocument::Compact));
}

bool JiebaSegmenter::initialize()
{
    const auto dictionaryDirectory = QStandardPaths::writableLocation(
        QStandardPaths::AppLocalDataLocation) + "/cppjieba";
    if (!QDir().mkpath(dictionaryDirectory)) {
        qWarning() << "Unable to create cppjieba dictionary directory:" << dictionaryDirectory;
        return false;
    }

    for (const auto& fileName : dictionaryFiles) {
        const auto destination = dictionaryDirectory + "/" + fileName;
        if (QFile::exists(destination))
            continue;

        if (!QFile::copy(":/dictionaries/cppjieba/" + fileName, destination)) {
            qWarning() << "Unable to extract cppjieba dictionary file:" << fileName;
            return false;
        }
    }

    try {
        m_jieba = std::make_unique<cppjieba::Jieba>(
            (dictionaryDirectory + "/jieba.dict.utf8").toStdString(),
            (dictionaryDirectory + "/hmm_model.utf8").toStdString(),
            (dictionaryDirectory + "/user.dict.utf8").toStdString(),
            (dictionaryDirectory + "/idf.utf8").toStdString(),
            (dictionaryDirectory + "/stop_words.utf8").toStdString());
    } catch (const std::exception& error) {
        qWarning() << "Unable to initialize cppjieba:" << error.what();
        return false;
    }

    return true;
}
