import makeTestSuite from '@zoroaster/mask';
import ChromeContext from '@contexts/chrome';
import IdioContext from '../context/idio';

export default
makeTestSuite('test/result', {
  persistentContext: [ChromeContext, IdioContext],
  /**
   * @param {ChromeContext} c
   * @param {IdioContext} i
   */
  async getResults({ Page, navigate, evaluate }, { url }) {
    await navigate(`${url}/test/${this.input}`);
    await Page.loadEventFired();
    // console.log(`${url}/test/${input}`)
    // await new Promise(r => setTimeout(r, 10000000))
    const { value: res } = await evaluate('window.test()', false);
    const value = JSON.parse(res);
    return value;
  },
  jsonProps: ['expected'],
});