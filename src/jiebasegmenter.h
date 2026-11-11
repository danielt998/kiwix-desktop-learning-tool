#ifndef JIEBASEGMENTER_H
#define JIEBASEGMENTER_H

#include <QString>

#include <memory>

namespace cppjieba {
class Jieba;
}

class JiebaSegmenter
{
public:
    JiebaSegmenter();
    ~JiebaSegmenter();

    QString segment(const QString& text);

private:
    bool initialize();

    std::unique_ptr<cppjieba::Jieba> m_jieba;
};

#endif // JIEBASEGMENTER_H
